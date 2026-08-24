-- ============================================================================
-- Row Level Security
--
-- Every table below has RLS enabled. Policies derive identity from
-- auth.uid() — never from a client-supplied id.
--
-- The service-role key bypasses RLS entirely. The API layer uses it only after
-- performing its own authorization checks; these policies are the second line
-- of defence, and the only defence for any direct client access.
-- ============================================================================

-- ─── Helper functions ───────────────────────────────────────────────────────
-- SECURITY DEFINER so policies can read the users table without recursing
-- through the policies on that same table.

create or replace function current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from users where auth_user_id = auth.uid();
$$;

create or replace function current_app_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from users where auth_user_id = auth.uid();
$$;

create or replace function current_facility_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select facility_id from users where auth_user_id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_app_role() = 'ADMIN', false);
$$;

create or replace function is_clinician()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_app_role() in ('DOCTOR', 'SPECIALIST'), false);
$$;

/**
 * The single source of truth for "may the current user touch this patient".
 *
 *   ADMIN            → every patient
 *   PATIENT          → their own record and linked family members
 *   ASHA             → patients assigned to them
 *   DOCTOR/SPECIALIST→ patients they have treated, or in their facility's district
 */
create or replace function can_access_patient(target_patient_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := current_app_user_id();
  my_role user_role := current_app_role();
  my_facility uuid := current_facility_id();
begin
  if me is null then
    return false;
  end if;

  if my_role = 'ADMIN' then
    return true;
  end if;

  if my_role = 'PATIENT' then
    return exists (
      select 1 from patients p
      where p.id = target_patient_id and p.user_id = me
    ) or exists (
      select 1
      from family_members fm
      join patients self on self.id = fm.patient_id
      where self.user_id = me and fm.related_patient_id = target_patient_id
    );
  end if;

  if my_role = 'ASHA' then
    return exists (
      select 1 from patients p
      where p.id = target_patient_id and p.assigned_asha_id = me
    );
  end if;

  if my_role in ('DOCTOR', 'SPECIALIST') then
    return exists (
      select 1 from consultations c
      where c.patient_id = target_patient_id and c.doctor_id = me
    ) or exists (
      select 1 from appointments a
      where a.patient_id = target_patient_id and a.doctor_id = me
    ) or (
      my_facility is not null and exists (
        select 1 from patients p
        join facilities f on f.id = my_facility
        where p.id = target_patient_id and p.district = f.district
      )
    );
  end if;

  return false;
end;
$$;

-- ─── Enable RLS everywhere ──────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'facilities', 'users', 'audit_logs', 'patients', 'allergies',
    'chronic_conditions', 'family_members', 'appointments', 'consultations',
    'vitals', 'medicines', 'prescriptions', 'prescription_items', 'diagnoses',
    'clinical_notes', 'referrals', 'referral_events', 'lab_tests', 'lab_orders',
    'lab_results', 'beds', 'bed_allocations', 'notifications', 'conversations',
    'conversation_members', 'messages', 'home_visits', 'tasks', 'vaccinations',
    'maternal_records', 'anc_visits', 'ncd_screenings', 'inventory',
    'inventory_transactions', 'stock_transfers', 'documents', 'sync_operations',
    'opd_tokens', 'telemedicine_sessions', 'treatment_plans',
    'discharge_summaries', 'follow_ups'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    -- Force RLS so even the table owner is subject to it.
    execute format('alter table %I force row level security', t);
  end loop;
end;
$$;

-- ─── Reference data: readable by any signed-in user ─────────────────────────
-- Facilities and the medicine formulary are directory information, not
-- patient data. Writes stay with administrators.

create policy facilities_read on facilities
  for select to authenticated using (true);
create policy facilities_admin_write on facilities
  for all to authenticated using (is_admin()) with check (is_admin());

create policy medicines_read on medicines
  for select to authenticated using (true);
create policy medicines_admin_write on medicines
  for all to authenticated using (is_admin()) with check (is_admin());

create policy lab_tests_read on lab_tests
  for select to authenticated using (true);
create policy lab_tests_admin_write on lab_tests
  for all to authenticated using (is_admin()) with check (is_admin());

-- ─── Users ──────────────────────────────────────────────────────────────────

-- A user always sees their own row.
create policy users_read_self on users
  for select to authenticated
  using (auth_user_id = auth.uid());

-- Staff need to see colleagues to assign tasks and referrals; patients do not.
create policy users_read_staff on users
  for select to authenticated
  using (is_admin() or is_clinician() or current_app_role() = 'ASHA');

-- Users may edit their own profile but never their own role or status.
create policy users_update_self on users
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (
    auth_user_id = auth.uid()
    and role = (select role from users where auth_user_id = auth.uid())
    and status = (select status from users where auth_user_id = auth.uid())
  );

create policy users_admin_all on users
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- ─── Patients and their clinical sub-records ────────────────────────────────

create policy patients_select on patients
  for select to authenticated using (can_access_patient(id));

create policy patients_insert on patients
  for insert to authenticated
  with check (current_app_role() in ('ASHA', 'DOCTOR', 'SPECIALIST', 'ADMIN'));

create policy patients_update on patients
  for update to authenticated
  using (can_access_patient(id))
  with check (can_access_patient(id));

-- Every table keyed by patient_id follows the same shape: read if you may
-- access that patient, write only if you are clinical or field staff.
--
-- Generated in a loop rather than written out 22 times, so the rule cannot
-- drift between tables. quote_ident() guards the identifier; the policy body is
-- a fixed literal, so no user input reaches this SQL.
do $$
declare
  t text;
  tables text[] := array[
    'allergies', 'chronic_conditions', 'family_members', 'appointments',
    'consultations', 'vitals', 'prescriptions', 'diagnoses', 'clinical_notes',
    'referrals', 'lab_orders', 'home_visits', 'vaccinations',
    'maternal_records', 'ncd_screenings', 'documents', 'treatment_plans',
    'discharge_summaries', 'follow_ups', 'opd_tokens', 'telemedicine_sessions',
    'bed_allocations'
  ];
begin
  foreach t in array tables
  loop
    execute 'create policy ' || quote_ident(t || '_select') ||
            ' on ' || quote_ident(t) ||
            ' for select to authenticated using (can_access_patient(patient_id))';

    execute 'create policy ' || quote_ident(t || '_write') ||
            ' on ' || quote_ident(t) ||
            ' for all to authenticated' ||
            ' using (can_access_patient(patient_id)' ||
            '   and current_app_role() in (''ASHA'',''DOCTOR'',''SPECIALIST'',''ADMIN''))' ||
            ' with check (can_access_patient(patient_id)' ||
            '   and current_app_role() in (''ASHA'',''DOCTOR'',''SPECIALIST'',''ADMIN''))';
  end loop;
end;
$$;

-- Patients may book and cancel their own appointments.
create policy appointments_patient_write on appointments
  for all to authenticated
  using (
    current_app_role() = 'PATIENT'
    and exists (select 1 from patients p where p.id = patient_id and p.user_id = current_app_user_id())
  )
  with check (
    current_app_role() = 'PATIENT'
    and exists (select 1 from patients p where p.id = patient_id and p.user_id = current_app_user_id())
  );

-- ─── Child rows reached through a parent ────────────────────────────────────

create policy prescription_items_select on prescription_items
  for select to authenticated
  using (exists (
    select 1 from prescriptions r
    where r.id = prescription_id and can_access_patient(r.patient_id)
  ));

create policy prescription_items_write on prescription_items
  for all to authenticated
  using (is_clinician() or is_admin())
  with check (is_clinician() or is_admin());

create policy lab_results_select on lab_results
  for select to authenticated
  using (exists (
    select 1 from lab_orders o
    where o.id = lab_order_id and can_access_patient(o.patient_id)
  ));

create policy lab_results_write on lab_results
  for all to authenticated
  using (is_clinician() or is_admin())
  with check (is_clinician() or is_admin());

create policy referral_events_select on referral_events
  for select to authenticated
  using (exists (
    select 1 from referrals r
    where r.id = referral_id and can_access_patient(r.patient_id)
  ));

create policy referral_events_write on referral_events
  for insert to authenticated
  with check (current_app_role() in ('ASHA','DOCTOR','SPECIALIST','ADMIN'));

create policy anc_visits_select on anc_visits
  for select to authenticated
  using (exists (
    select 1 from maternal_records m
    where m.id = maternal_record_id and can_access_patient(m.patient_id)
  ));

create policy anc_visits_write on anc_visits
  for all to authenticated
  using (current_app_role() in ('ASHA','DOCTOR','SPECIALIST','ADMIN'))
  with check (current_app_role() in ('ASHA','DOCTOR','SPECIALIST','ADMIN'));

-- Referrals are also visible to the destination facility before acceptance,
-- which the patient-access rule alone would not permit.
create policy referrals_destination_read on referrals
  for select to authenticated
  using (
    current_facility_id() is not null
    and (destination_facility_id = current_facility_id()
         or source_facility_id = current_facility_id())
  );

create policy referrals_destination_update on referrals
  for update to authenticated
  using (
    current_facility_id() is not null
    and destination_facility_id = current_facility_id()
    and current_app_role() in ('DOCTOR','SPECIALIST','ADMIN')
  )
  with check (true);

-- ─── Beds and inventory: operational, not patient-identifiable ──────────────

create policy beds_read on beds
  for select to authenticated using (true);

create policy beds_write on beds
  for all to authenticated
  using (current_app_role() in ('DOCTOR','SPECIALIST','ADMIN'))
  with check (current_app_role() in ('DOCTOR','SPECIALIST','ADMIN'));

create policy inventory_read on inventory
  for select to authenticated using (true);

create policy inventory_write on inventory
  for all to authenticated
  using (current_app_role() in ('DOCTOR','ADMIN'))
  with check (current_app_role() in ('DOCTOR','ADMIN'));

create policy inventory_tx_read on inventory_transactions
  for select to authenticated using (true);

create policy inventory_tx_write on inventory_transactions
  for insert to authenticated
  with check (current_app_role() in ('DOCTOR','ADMIN'));

create policy transfers_read on stock_transfers
  for select to authenticated using (true);

create policy transfers_write on stock_transfers
  for all to authenticated
  using (current_app_role() in ('DOCTOR','ADMIN'))
  with check (current_app_role() in ('DOCTOR','ADMIN'));

-- ─── Notifications ──────────────────────────────────────────────────────────
-- A notification is visible when addressed to this user directly, or when it is
-- a broadcast whose role/facility matches.

create policy notifications_select on notifications
  for select to authenticated
  using (
    user_id = current_app_user_id()
    or (
      user_id is null
      and (role is null or role = current_app_role())
      and (facility_id is null or facility_id = current_facility_id())
    )
  );

create policy notifications_update on notifications
  for update to authenticated
  using (
    user_id = current_app_user_id()
    or (user_id is null
        and (role is null or role = current_app_role())
        and (facility_id is null or facility_id = current_facility_id()))
  )
  with check (true);

create policy notifications_insert on notifications
  for insert to authenticated
  with check (current_app_role() in ('ASHA','DOCTOR','SPECIALIST','ADMIN'));

-- ─── Messaging: members only ────────────────────────────────────────────────

create policy conversations_select on conversations
  for select to authenticated
  using (exists (
    select 1 from conversation_members m
    where m.conversation_id = id and m.user_id = current_app_user_id()
  ));

create policy conversations_insert on conversations
  for insert to authenticated with check (created_by = current_app_user_id());

create policy conversation_members_select on conversation_members
  for select to authenticated
  using (
    user_id = current_app_user_id()
    or exists (
      select 1 from conversation_members m2
      where m2.conversation_id = conversation_id and m2.user_id = current_app_user_id()
    )
  );

create policy conversation_members_insert on conversation_members
  for insert to authenticated
  with check (exists (
    select 1 from conversations c
    where c.id = conversation_id and c.created_by = current_app_user_id()
  ));

create policy messages_select on messages
  for select to authenticated
  using (exists (
    select 1 from conversation_members m
    where m.conversation_id = conversation_id and m.user_id = current_app_user_id()
  ));

create policy messages_insert on messages
  for insert to authenticated
  with check (
    sender_id = current_app_user_id()
    and exists (
      select 1 from conversation_members m
      where m.conversation_id = conversation_id and m.user_id = current_app_user_id()
    )
  );

create policy messages_update on messages
  for update to authenticated
  using (exists (
    select 1 from conversation_members m
    where m.conversation_id = conversation_id and m.user_id = current_app_user_id()
  ))
  with check (true);

-- ─── Tasks: assignee or creator ─────────────────────────────────────────────

create policy tasks_select on tasks
  for select to authenticated
  using (
    assigned_to = current_app_user_id()
    or created_by = current_app_user_id()
    or is_admin()
  );

create policy tasks_insert on tasks
  for insert to authenticated
  with check (current_app_role() in ('ASHA','DOCTOR','SPECIALIST','ADMIN'));

create policy tasks_update on tasks
  for update to authenticated
  using (
    assigned_to = current_app_user_id()
    or created_by = current_app_user_id()
    or is_admin()
  )
  with check (true);

-- ─── Audit logs: administrators only ────────────────────────────────────────
-- Deliberately no UPDATE or DELETE policy: the audit trail is append-only.

create policy audit_logs_admin_read on audit_logs
  for select to authenticated using (is_admin());

create policy audit_logs_insert on audit_logs
  for insert to authenticated with check (true);

-- ─── Sync ledger: owner only ────────────────────────────────────────────────

create policy sync_operations_own on sync_operations
  for all to authenticated
  using (user_id = current_app_user_id())
  with check (user_id = current_app_user_id());
