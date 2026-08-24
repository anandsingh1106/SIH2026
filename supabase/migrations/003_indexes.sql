-- ============================================================================
-- Indexes and concurrency constraints
--
-- The two partial UNIQUE indexes below are load-bearing: they are the database
-- guarantee behind "no double-booked doctor slot" and "no double-allocated
-- bed", independent of any application-level check.
-- ============================================================================

-- ─── Identity ───────────────────────────────────────────────────────────────
create index idx_facilities_district on facilities(district);
create index idx_facilities_type on facilities(type);
create index idx_facilities_active on facilities(active) where active;

create index idx_users_role on users(role);
create index idx_users_facility on users(facility_id);
create index idx_users_district on users(district);
create index idx_users_auth on users(auth_user_id);

create index idx_audit_actor on audit_logs(actor_id);
create index idx_audit_entity on audit_logs(entity_type, entity_id);
create index idx_audit_created on audit_logs(created_at desc);

-- ─── Patients ───────────────────────────────────────────────────────────────
create index idx_patients_user on patients(user_id);
create index idx_patients_district on patients(district);
create index idx_patients_village on patients(village);
create index idx_patients_asha on patients(assigned_asha_id);
create index idx_patients_phone on patients(phone);

-- Case-insensitive name search backing GET /api/patients?search=
create index idx_patients_name_trgm on patients using gin (lower(name) gin_trgm_ops);

create index idx_allergies_patient on allergies(patient_id);
create index idx_chronic_patient on chronic_conditions(patient_id);
create index idx_family_patient on family_members(patient_id);

-- ─── Appointments ───────────────────────────────────────────────────────────
create index idx_appt_patient on appointments(patient_id);
create index idx_appt_doctor on appointments(doctor_id);
create index idx_appt_facility on appointments(facility_id);
create index idx_appt_date on appointments(appointment_date);
create index idx_appt_status on appointments(status);

-- One live appointment per doctor/date/time. Cancelled and no-show rows are
-- excluded so a freed slot can be rebooked.
create unique index idx_appt_slot_unique
  on appointments(doctor_id, appointment_date, appointment_time)
  where doctor_id is not null and status not in ('CANCELLED', 'NO_SHOW');

-- ─── Clinical ───────────────────────────────────────────────────────────────
create index idx_consult_patient on consultations(patient_id);
create index idx_consult_doctor on consultations(doctor_id);
create index idx_consult_facility on consultations(facility_id);
create index idx_consult_created on consultations(created_at desc);

create index idx_vitals_patient on vitals(patient_id);
create index idx_vitals_recorded on vitals(recorded_at desc);

create index idx_medicines_name on medicines(lower(name));
create index idx_medicines_generic on medicines(lower(generic_name));
create index idx_medicines_category on medicines(category);

create index idx_rx_patient on prescriptions(patient_id);
create index idx_rx_doctor on prescriptions(doctor_id);
create index idx_rx_consultation on prescriptions(consultation_id);
create index idx_rx_issued on prescriptions(issued_at desc);
create index idx_rx_items_rx on prescription_items(prescription_id);

create index idx_diagnoses_patient on diagnoses(patient_id);
create index idx_notes_patient on clinical_notes(patient_id);

-- ─── Referrals ──────────────────────────────────────────────────────────────
create index idx_ref_patient on referrals(patient_id);
create index idx_ref_status on referrals(status);
create index idx_ref_dest on referrals(destination_facility_id);
create index idx_ref_source on referrals(source_facility_id);
create index idx_ref_urgency on referrals(urgency);
create index idx_ref_code on referrals(referral_code);
create index idx_ref_events_ref on referral_events(referral_id, created_at);

-- ─── Labs ───────────────────────────────────────────────────────────────────
create index idx_lab_tests_name on lab_tests(lower(name));
create index idx_lab_orders_patient on lab_orders(patient_id);
create index idx_lab_orders_status on lab_orders(status);
create index idx_lab_orders_facility on lab_orders(facility_id);
create index idx_lab_results_order on lab_results(lab_order_id);

-- ─── Beds ───────────────────────────────────────────────────────────────────
create index idx_beds_facility on beds(facility_id);
create index idx_beds_status on beds(status);
create index idx_beds_type on beds(type);
create index idx_bed_alloc_bed on bed_allocations(bed_id);
create index idx_bed_alloc_patient on bed_allocations(patient_id);

-- At most one live allocation per bed. This is what makes concurrent
-- allocation attempts fail rather than both succeeding.
create unique index idx_bed_alloc_active
  on bed_allocations(bed_id) where released_at is null;

-- ─── Notifications and messaging ────────────────────────────────────────────
create index idx_notif_user on notifications(user_id);
create index idx_notif_role on notifications(role);
create index idx_notif_facility on notifications(facility_id);
create index idx_notif_unread on notifications(user_id, read) where not read;
create index idx_notif_created on notifications(created_at desc);

create index idx_conv_members_user on conversation_members(user_id);
create index idx_messages_conv on messages(conversation_id, created_at);

-- ─── ASHA field modules ─────────────────────────────────────────────────────
create index idx_visits_asha on home_visits(asha_id);
create index idx_visits_patient on home_visits(patient_id);
create index idx_visits_date on home_visits(visit_date desc);

create index idx_tasks_assignee on tasks(assigned_to);
create index idx_tasks_status on tasks(status);
create index idx_tasks_due on tasks(due_date);
create index idx_tasks_patient on tasks(patient_id);
create index idx_tasks_open on tasks(assigned_to, priority) where status in ('TODO', 'IN_PROGRESS');

create index idx_vacc_patient on vaccinations(patient_id);
create index idx_vacc_status on vaccinations(status);
create index idx_vacc_due on vaccinations(scheduled_date) where status in ('DUE', 'OVERDUE');

create index idx_maternal_patient on maternal_records(patient_id);
create index idx_maternal_asha on maternal_records(asha_id);
create index idx_maternal_risk on maternal_records(high_risk) where high_risk;
create index idx_anc_record on anc_visits(maternal_record_id);

create index idx_ncd_patient on ncd_screenings(patient_id);
create index idx_ncd_risk on ncd_screenings(risk_category);
create index idx_ncd_date on ncd_screenings(screening_date desc);

-- ─── Inventory ──────────────────────────────────────────────────────────────
create index idx_inv_medicine on inventory(medicine_id);
create index idx_inv_facility on inventory(facility_id);
create index idx_inv_expiry on inventory(expiry_date);
create index idx_inv_low on inventory(facility_id) where quantity <= reorder_level;
create index idx_inv_tx_inventory on inventory_transactions(inventory_id, created_at desc);
create index idx_transfers_from on stock_transfers(from_facility_id);
create index idx_transfers_to on stock_transfers(to_facility_id);

-- ─── Queue, documents, sync ─────────────────────────────────────────────────
create index idx_queue_facility_date on opd_tokens(facility_id, queue_date);
create index idx_queue_status on opd_tokens(status);
create index idx_queue_waiting on opd_tokens(facility_id, queue_date, token_number)
  where status = 'WAITING';

create index idx_docs_patient on documents(patient_id);
create index idx_sync_user on sync_operations(user_id);

create index idx_tele_patient on telemedicine_sessions(patient_id);
create index idx_tele_doctor on telemedicine_sessions(doctor_id);
create index idx_plans_patient on treatment_plans(patient_id);
create index idx_discharge_patient on discharge_summaries(patient_id);
create index idx_followups_patient on follow_ups(patient_id);
create index idx_followups_due on follow_ups(due_date) where status = 'PENDING';
