/**
 * Phase 4 — ASHA field work: home visits, tasks, immunization, maternal health
 * and NCD screening.
 */
export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS home_visits (
      id TEXT PRIMARY KEY,
      asha_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      household_id TEXT,
      visit_date TEXT NOT NULL,
      purpose TEXT,
      observations TEXT,
      symptoms TEXT,
      danger_signs TEXT,
      risk_level TEXT CHECK (risk_level IN ('LOW','MODERATE','HIGH','CRITICAL')),
      referral_recommended INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      next_visit_date TEXT,
      latitude REAL,
      longitude REAL,
      sync_status TEXT NOT NULL DEFAULT 'SYNCED'
        CHECK (sync_status IN ('PENDING','SYNCED','FAILED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_visits_asha ON home_visits(asha_id);
    CREATE INDEX IF NOT EXISTS idx_visits_patient ON home_visits(patient_id);
    CREATE INDEX IF NOT EXISTS idx_visits_date ON home_visits(visit_date);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      assigned_to TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      type TEXT NOT NULL DEFAULT 'GENERAL',
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'TODO'
        CHECK (status IN ('TODO','IN_PROGRESS','COMPLETED','CANCELLED')),
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_patient ON tasks(patient_id);

    CREATE TABLE IF NOT EXISTS vaccinations (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      vaccine_name TEXT NOT NULL,
      dose TEXT,
      scheduled_date TEXT,
      administered_date TEXT,
      administered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      batch_number TEXT,
      status TEXT NOT NULL DEFAULT 'DUE'
        CHECK (status IN ('DUE','GIVEN','OVERDUE','SKIPPED')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vacc_patient ON vaccinations(patient_id);
    CREATE INDEX IF NOT EXISTS idx_vacc_status ON vaccinations(status);
    CREATE INDEX IF NOT EXISTS idx_vacc_scheduled ON vaccinations(scheduled_date);

    CREATE TABLE IF NOT EXISTS maternal_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      asha_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      lmp_date TEXT,
      edd_date TEXT,
      gravida INTEGER,
      parity INTEGER,
      high_risk INTEGER NOT NULL DEFAULT 0,
      risk_factors TEXT,
      jssk_registered INTEGER NOT NULL DEFAULT 0,
      pmsma_registered INTEGER NOT NULL DEFAULT 0,
      outcome TEXT CHECK (outcome IN ('ONGOING','DELIVERED','ABORTED','REFERRED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_maternal_patient ON maternal_records(patient_id);
    CREATE INDEX IF NOT EXISTS idx_maternal_asha ON maternal_records(asha_id);
    CREATE INDEX IF NOT EXISTS idx_maternal_risk ON maternal_records(high_risk);

    CREATE TABLE IF NOT EXISTS anc_visits (
      id TEXT PRIMARY KEY,
      maternal_record_id TEXT NOT NULL REFERENCES maternal_records(id) ON DELETE CASCADE,
      visit_number INTEGER NOT NULL,
      visit_date TEXT NOT NULL,
      recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      weight REAL,
      blood_pressure_systolic INTEGER,
      blood_pressure_diastolic INTEGER,
      hemoglobin REAL,
      fundal_height TEXT,
      fetal_heart_rate INTEGER,
      tetanus_given INTEGER NOT NULL DEFAULT 0,
      ifa_tablets_given INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_anc_record ON anc_visits(maternal_record_id);

    CREATE TABLE IF NOT EXISTS ncd_screenings (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      screened_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      screening_date TEXT NOT NULL,
      age INTEGER,
      blood_pressure_systolic INTEGER,
      blood_pressure_diastolic INTEGER,
      blood_glucose REAL,
      bmi REAL,
      waist_circumference REAL,
      tobacco_use INTEGER NOT NULL DEFAULT 0,
      alcohol_use INTEGER NOT NULL DEFAULT 0,
      physical_activity_adequate INTEGER NOT NULL DEFAULT 1,
      family_history INTEGER NOT NULL DEFAULT 0,
      cbac_score INTEGER,
      risk_category TEXT CHECK (risk_category IN ('LOW','MODERATE','HIGH')),
      suspected_diabetes INTEGER NOT NULL DEFAULT 0,
      suspected_hypertension INTEGER NOT NULL DEFAULT 0,
      recommendations TEXT,
      referral_id TEXT REFERENCES referrals(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ncd_patient ON ncd_screenings(patient_id);
    CREATE INDEX IF NOT EXISTS idx_ncd_risk ON ncd_screenings(risk_category);
    CREATE INDEX IF NOT EXISTS idx_ncd_date ON ncd_screenings(screening_date);
  `);
}
