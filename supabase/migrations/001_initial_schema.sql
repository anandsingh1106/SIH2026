-- ============================================================================
-- MahaAarogya Sangam — initial PostgreSQL schema
--
-- Ported from the SQLite schema. Differences from the SQLite original:
--   * TEXT ids become UUID with gen_random_uuid() defaults
--   * INTEGER 0/1 flags become BOOLEAN
--   * TEXT timestamps become TIMESTAMPTZ
--   * CHECK-constrained status columns become native ENUM types
--   * users.firebase_uid is replaced by auth_user_id -> auth.users(id)
--
-- Run order: 001_initial_schema -> 002_rls_policies -> 003_indexes
-- ============================================================================

-- gen_random_uuid()
create extension if not exists "pgcrypto";
-- trigram index backing case-insensitive patient name search
create extension if not exists "pg_trgm";

-- ─── Enums ──────────────────────────────────────────────────────────────────

create type user_role as enum ('PATIENT', 'ASHA', 'DOCTOR', 'SPECIALIST', 'ADMIN');
create type user_status as enum ('ACTIVE', 'INACTIVE', 'SUSPENDED');

create type facility_type as enum (
  'SUB_CENTER', 'PHC', 'CHC', 'DISTRICT_HOSPITAL', 'SPECIALIST_HOSPITAL', 'MEDICAL_COLLEGE'
);

create type gender_type as enum ('MALE', 'FEMALE', 'OTHER');
create type severity_level as enum ('MILD', 'MODERATE', 'SEVERE');
create type condition_status as enum ('ACTIVE', 'RESOLVED', 'MANAGED');

create type appointment_type as enum ('IN_PERSON', 'TELEMEDICINE');
create type appointment_status as enum (
  'BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
);

create type consultation_status as enum ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type prescription_status as enum ('ACTIVE', 'DISPENSED', 'COMPLETED', 'CANCELLED');
create type diagnosis_status as enum ('ACTIVE', 'RESOLVED', 'RULED_OUT');

create type referral_urgency as enum ('ROUTINE', 'URGENT', 'EMERGENCY');
create type referral_status as enum (
  'CREATED', 'SENT', 'ACCEPTED', 'REJECTED', 'IN_TRANSIT',
  'ARRIVED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED'
);

create type lab_priority as enum ('ROUTINE', 'URGENT', 'STAT');
create type lab_order_status as enum (
  'ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'
);
create type abnormal_flag as enum ('NORMAL', 'LOW', 'HIGH', 'CRITICAL');

create type bed_type as enum (
  'GENERAL', 'ICU', 'VENTILATOR', 'PEDIATRIC', 'MATERNITY', 'EMERGENCY'
);
create type bed_status as enum ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE');

create type risk_level as enum ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
create type sync_status as enum ('PENDING', 'SYNCED', 'FAILED');

create type task_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
create type task_status as enum ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

create type vaccination_status as enum ('DUE', 'GIVEN', 'OVERDUE', 'SKIPPED');
create type maternal_outcome as enum ('ONGOING', 'DELIVERED', 'ABORTED', 'REFERRED');
create type ncd_risk as enum ('LOW', 'MODERATE', 'HIGH');

create type inventory_tx_type as enum (
  'STOCK_IN', 'STOCK_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'EXPIRED'
);
create type transfer_status as enum ('REQUESTED', 'APPROVED', 'COMPLETED', 'CANCELLED');

create type notification_priority as enum ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
create type queue_status as enum ('WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
create type session_status as enum ('SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED');
create type plan_status as enum ('ACTIVE', 'COMPLETED', 'CANCELLED');
create type followup_status as enum ('PENDING', 'COMPLETED', 'MISSED', 'CANCELLED');
create type sync_result as enum ('SUCCESS', 'FAILED');

-- ─── Shared updated_at trigger ──────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Identity ───────────────────────────────────────────────────────────────

create table facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type facility_type not null,
  address text,
  district text not null,
  taluka text,
  village text,
  latitude double precision,
  longitude double precision,
  phone text,
  email text,
  emergency_available boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Application users. auth_user_id links to Supabase Auth; it replaces the
-- former firebase_uid column.
create table users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  phone text not null unique,
  email text,
  role user_role not null,
  status user_status not null default 'ACTIVE',
  district text,
  taluka text,
  village text,
  abha_id text,
  facility_id uuid references facilities(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ─── Patients ───────────────────────────────────────────────────────────────

create table patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  abha_id text unique,
  name text not null,
  date_of_birth date,
  gender gender_type,
  phone text,
  address text,
  district text,
  taluka text,
  village text,
  blood_group text,
  emergency_contact text,
  emergency_contact_phone text,
  assigned_asha_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  substance text not null,
  reaction text,
  severity severity_level,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table chronic_conditions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  condition text not null,
  diagnosed_date date,
  status condition_status not null default 'ACTIVE',
  notes text,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table family_members (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  related_patient_id uuid references patients(id) on delete cascade,
  name text,
  relationship text not null,
  created_at timestamptz not null default now(),
  unique (patient_id, related_patient_id, relationship)
);

-- ─── Scheduling ─────────────────────────────────────────────────────────────

create table appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid references users(id) on delete set null,
  facility_id uuid references facilities(id) on delete set null,
  specialty text,
  appointment_date date not null,
  appointment_time time not null,
  type appointment_type not null default 'IN_PERSON',
  status appointment_status not null default 'BOOKED',
  reason text,
  token_number integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Clinical records ───────────────────────────────────────────────────────

create table consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid references users(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  facility_id uuid references facilities(id) on delete set null,
  chief_complaint text,
  symptoms jsonb,
  examination text,
  diagnosis text,
  icd_code text,
  clinical_notes text,
  treatment_plan text,
  follow_up_date date,
  is_telemedicine boolean not null default false,
  status consultation_status not null default 'IN_PROGRESS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vitals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  consultation_id uuid references consultations(id) on delete set null,
  recorded_by uuid references users(id) on delete set null,
  facility_id uuid references facilities(id) on delete set null,
  temperature numeric(4,1),
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  heart_rate integer,
  respiratory_rate integer,
  oxygen_saturation integer,
  weight numeric(5,2),
  height numeric(5,2),
  bmi numeric(4,1),
  blood_glucose numeric(5,1),
  hemoglobin numeric(4,1),
  notes text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic_name text,
  strength text,
  dosage_form text,
  manufacturer text,
  category text,
  is_essential boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid references users(id) on delete set null,
  consultation_id uuid references consultations(id) on delete set null,
  facility_id uuid references facilities(id) on delete set null,
  diagnosis text,
  instructions text,
  dietary_instructions text,
  follow_up_date date,
  status prescription_status not null default 'ACTIVE',
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  medicine_id uuid references medicines(id) on delete set null,
  medicine_name text not null,
  dosage text,
  frequency text,
  duration text,
  route text,
  timing jsonb,
  quantity integer,
  instructions text,
  instructions_mr text,
  instructions_hi text,
  created_at timestamptz not null default now()
);

create table diagnoses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  consultation_id uuid references consultations(id) on delete set null,
  recorded_by uuid references users(id) on delete set null,
  description text not null,
  icd_code text,
  status diagnosis_status not null default 'ACTIVE',
  diagnosed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table clinical_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  consultation_id uuid references consultations(id) on delete set null,
  author_id uuid references users(id) on delete set null,
  facility_id uuid references facilities(id) on delete set null,
  note_type text not null default 'GENERAL',
  content text not null,
  created_at timestamptz not null default now()
);

-- ─── Referrals ──────────────────────────────────────────────────────────────

create table referrals (
  id uuid primary key default gen_random_uuid(),
  referral_code text unique,
  patient_id uuid not null references patients(id) on delete cascade,
  referred_by uuid references users(id) on delete set null,
  referred_to uuid references users(id) on delete set null,
  source_facility_id uuid references facilities(id) on delete set null,
  destination_facility_id uuid references facilities(id) on delete set null,
  specialty text,
  reason text,
  urgency referral_urgency not null default 'ROUTINE',
  clinical_summary text,
  diagnosis text,
  status referral_status not null default 'CREATED',
  ai_priority_score numeric(5,2),
  ai_rationale text,
  allocated_bed_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

create table referral_events (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references referrals(id) on delete cascade,
  status referral_status not null,
  note text,
  actor_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── Labs ───────────────────────────────────────────────────────────────────

create table lab_tests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  unit text,
  reference_range text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table lab_orders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid references users(id) on delete set null,
  facility_id uuid references facilities(id) on delete set null,
  consultation_id uuid references consultations(id) on delete set null,
  lab_test_id uuid references lab_tests(id) on delete set null,
  test_name text not null,
  category text,
  priority lab_priority not null default 'ROUTINE',
  status lab_order_status not null default 'ORDERED',
  notes text,
  ordered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table lab_results (
  id uuid primary key default gen_random_uuid(),
  lab_order_id uuid not null references lab_orders(id) on delete cascade,
  result text,
  unit text,
  reference_range text,
  abnormal_flag abnormal_flag,
  notes text,
  verified_by uuid references users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Beds ───────────────────────────────────────────────────────────────────

create table beds (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  ward text,
  bed_number text not null,
  type bed_type not null default 'GENERAL',
  status bed_status not null default 'AVAILABLE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, bed_number)
);

create table bed_allocations (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid not null references beds(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  referral_id uuid references referrals(id) on delete set null,
  allocated_by uuid references users(id) on delete set null,
  allocated_at timestamptz not null default now(),
  released_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table referrals
  add constraint referrals_allocated_bed_fk
  foreign key (allocated_bed_id) references beds(id) on delete set null;

-- ─── Notifications and messaging ────────────────────────────────────────────

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  role user_role,
  facility_id uuid references facilities(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  priority notification_priority not null default 'NORMAL',
  link text,
  metadata jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  subject text,
  patient_id uuid references patients(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid references users(id) on delete set null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── ASHA field modules ─────────────────────────────────────────────────────

create table home_visits (
  id uuid primary key default gen_random_uuid(),
  asha_id uuid references users(id) on delete set null,
  patient_id uuid not null references patients(id) on delete cascade,
  household_id text,
  visit_date date not null,
  purpose text,
  observations text,
  symptoms jsonb,
  danger_signs jsonb,
  risk_level risk_level,
  referral_recommended boolean not null default false,
  notes text,
  next_visit_date date,
  latitude double precision,
  longitude double precision,
  sync_status sync_status not null default 'SYNCED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  assigned_to uuid references users(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  patient_id uuid references patients(id) on delete cascade,
  facility_id uuid references facilities(id) on delete set null,
  type text not null default 'GENERAL',
  title text not null,
  description text,
  priority task_priority not null default 'MEDIUM',
  due_date date,
  status task_status not null default 'TODO',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vaccinations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  vaccine_name text not null,
  dose text,
  scheduled_date date,
  administered_date date,
  administered_by uuid references users(id) on delete set null,
  facility_id uuid references facilities(id) on delete set null,
  batch_number text,
  status vaccination_status not null default 'DUE',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table maternal_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  asha_id uuid references users(id) on delete set null,
  lmp_date date,
  edd_date date,
  gravida integer,
  parity integer,
  high_risk boolean not null default false,
  risk_factors jsonb,
  jssk_registered boolean not null default false,
  pmsma_registered boolean not null default false,
  outcome maternal_outcome default 'ONGOING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table anc_visits (
  id uuid primary key default gen_random_uuid(),
  maternal_record_id uuid not null references maternal_records(id) on delete cascade,
  visit_number integer not null,
  visit_date date not null,
  recorded_by uuid references users(id) on delete set null,
  weight numeric(5,2),
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  hemoglobin numeric(4,1),
  fundal_height text,
  fetal_heart_rate integer,
  tetanus_given boolean not null default false,
  ifa_tablets_given integer,
  notes text,
  created_at timestamptz not null default now()
);

create table ncd_screenings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  screened_by uuid references users(id) on delete set null,
  facility_id uuid references facilities(id) on delete set null,
  screening_date date not null default current_date,
  age integer,
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  blood_glucose numeric(5,1),
  bmi numeric(4,1),
  waist_circumference numeric(5,1),
  tobacco_use boolean not null default false,
  alcohol_use boolean not null default false,
  physical_activity_adequate boolean not null default true,
  family_history boolean not null default false,
  cbac_score integer,
  risk_category ncd_risk,
  suspected_diabetes boolean not null default false,
  suspected_hypertension boolean not null default false,
  recommendations jsonb,
  referral_id uuid references referrals(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── Inventory ──────────────────────────────────────────────────────────────

create table inventory (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references medicines(id) on delete cascade,
  facility_id uuid not null references facilities(id) on delete cascade,
  batch_number text,
  expiry_date date,
  quantity integer not null default 0 check (quantity >= 0),
  reorder_level integer not null default 0,
  unit_price numeric(10,2),
  supplier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (medicine_id, facility_id, batch_number)
);

create table inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references inventory(id) on delete cascade,
  type inventory_tx_type not null,
  quantity integer not null,
  quantity_before integer not null,
  quantity_after integer not null,
  reason text,
  reference_id text,
  performed_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table stock_transfers (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references medicines(id) on delete cascade,
  from_facility_id uuid not null references facilities(id) on delete cascade,
  to_facility_id uuid not null references facilities(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  status transfer_status not null default 'COMPLETED',
  requested_by uuid references users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Documents, sync, queue, telemedicine, discharge ────────────────────────

create table documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  uploaded_by uuid references users(id) on delete set null,
  document_type text not null,
  filename text not null,
  storage_key text not null,
  mime_type text,
  size integer,
  created_at timestamptz not null default now()
);

-- Idempotency ledger for offline batch sync.
create table sync_operations (
  operation_id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  entity text not null,
  action text not null,
  server_id text,
  status sync_result not null,
  error text,
  client_timestamp timestamptz,
  processed_at timestamptz not null default now()
);

create table opd_tokens (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid references users(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  token_number integer not null,
  queue_date date not null default current_date,
  status queue_status not null default 'WAITING',
  called_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, queue_date, token_number)
);

create table telemedicine_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid references users(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  room_id text not null unique,
  status session_status not null default 'SCHEDULED',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table treatment_plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  referral_id uuid references referrals(id) on delete set null,
  diagnosis text,
  plan text,
  phases jsonb,
  status plan_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table discharge_summaries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  discharged_by uuid references users(id) on delete set null,
  facility_id uuid references facilities(id) on delete set null,
  referral_id uuid references referrals(id) on delete set null,
  admission_date date,
  discharge_date date not null,
  diagnosis text,
  treatment_given text,
  condition_at_discharge text,
  instructions text,
  follow_up_date date,
  created_at timestamptz not null default now()
);

create table follow_ups (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  assigned_to uuid references users(id) on delete set null,
  source_type text,
  source_id uuid,
  due_date date not null,
  status followup_status not null default 'PENDING',
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── updated_at triggers ────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'facilities', 'users', 'patients', 'appointments', 'consultations',
    'medicines', 'prescriptions', 'referrals', 'lab_orders', 'beds',
    'conversations', 'home_visits', 'tasks', 'vaccinations',
    'maternal_records', 'inventory', 'stock_transfers', 'opd_tokens',
    'telemedicine_sessions', 'treatment_plans', 'follow_ups'
  ]
  loop
    execute format(
      'create trigger set_%I_updated_at before update on %I
       for each row execute function set_updated_at()', t, t
    );
  end loop;
end;
$$;
