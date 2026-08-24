/**
 * Phase 7/8 — OPD token queue, telemedicine sessions, and discharge/follow-up.
 */
export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS opd_tokens (
      id TEXT PRIMARY KEY,
      facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
      token_number INTEGER NOT NULL,
      queue_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'WAITING'
        CHECK (status IN ('WAITING','CALLED','IN_PROGRESS','COMPLETED','SKIPPED')),
      called_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (facility_id, queue_date, token_number)
    );
    CREATE INDEX IF NOT EXISTS idx_queue_facility_date ON opd_tokens(facility_id, queue_date);
    CREATE INDEX IF NOT EXISTS idx_queue_status ON opd_tokens(status);

    CREATE TABLE IF NOT EXISTS telemedicine_sessions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
      room_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED','ACTIVE','ENDED','CANCELLED')),
      started_at TEXT,
      ended_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tele_patient ON telemedicine_sessions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_tele_doctor ON telemedicine_sessions(doctor_id);

    CREATE TABLE IF NOT EXISTS treatment_plans (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      referral_id TEXT REFERENCES referrals(id) ON DELETE SET NULL,
      diagnosis TEXT,
      plan TEXT,
      phases TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_plans_patient ON treatment_plans(patient_id);

    CREATE TABLE IF NOT EXISTS discharge_summaries (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      discharged_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      referral_id TEXT REFERENCES referrals(id) ON DELETE SET NULL,
      admission_date TEXT,
      discharge_date TEXT NOT NULL,
      diagnosis TEXT,
      treatment_given TEXT,
      condition_at_discharge TEXT,
      instructions TEXT,
      follow_up_date TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_discharge_patient ON discharge_summaries(patient_id);

    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
      source_type TEXT,
      source_id TEXT,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','COMPLETED','MISSED','CANCELLED')),
      notes TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_followups_patient ON follow_ups(patient_id);
    CREATE INDEX IF NOT EXISTS idx_followups_due ON follow_ups(due_date);
  `);
}
