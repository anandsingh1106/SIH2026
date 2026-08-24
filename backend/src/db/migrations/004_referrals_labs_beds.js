/**
 * Phase 3 — referrals with an event timeline, the lab system, and beds.
 */
export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referral_code TEXT UNIQUE,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      referred_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      referred_to TEXT REFERENCES users(id) ON DELETE SET NULL,
      source_facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      destination_facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      specialty TEXT,
      reason TEXT,
      urgency TEXT NOT NULL DEFAULT 'ROUTINE'
        CHECK (urgency IN ('ROUTINE','URGENT','EMERGENCY')),
      clinical_summary TEXT,
      diagnosis TEXT,
      status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN (
        'CREATED','SENT','ACCEPTED','REJECTED','IN_TRANSIT','ARRIVED',
        'IN_CONSULTATION','COMPLETED','CANCELLED'
      )),
      ai_priority_score REAL,
      ai_rationale TEXT,
      allocated_bed_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      accepted_at TEXT,
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ref_patient ON referrals(patient_id);
    CREATE INDEX IF NOT EXISTS idx_ref_status ON referrals(status);
    CREATE INDEX IF NOT EXISTS idx_ref_dest ON referrals(destination_facility_id);
    CREATE INDEX IF NOT EXISTS idx_ref_source ON referrals(source_facility_id);
    CREATE INDEX IF NOT EXISTS idx_ref_urgency ON referrals(urgency);
    CREATE INDEX IF NOT EXISTS idx_ref_code ON referrals(referral_code);

    CREATE TABLE IF NOT EXISTS referral_events (
      id TEXT PRIMARY KEY,
      referral_id TEXT NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      note TEXT,
      actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ref_events_ref ON referral_events(referral_id);

    CREATE TABLE IF NOT EXISTS lab_tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT,
      reference_range TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_lab_tests_name ON lab_tests(name);

    CREATE TABLE IF NOT EXISTS lab_orders (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      consultation_id TEXT REFERENCES consultations(id) ON DELETE SET NULL,
      lab_test_id TEXT REFERENCES lab_tests(id) ON DELETE SET NULL,
      test_name TEXT NOT NULL,
      category TEXT,
      priority TEXT NOT NULL DEFAULT 'ROUTINE'
        CHECK (priority IN ('ROUTINE','URGENT','STAT')),
      status TEXT NOT NULL DEFAULT 'ORDERED' CHECK (status IN (
        'ORDERED','SAMPLE_COLLECTED','PROCESSING','COMPLETED','CANCELLED'
      )),
      notes TEXT,
      ordered_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
    CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
    CREATE INDEX IF NOT EXISTS idx_lab_orders_facility ON lab_orders(facility_id);

    CREATE TABLE IF NOT EXISTS lab_results (
      id TEXT PRIMARY KEY,
      lab_order_id TEXT NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
      result TEXT,
      unit TEXT,
      reference_range TEXT,
      abnormal_flag TEXT CHECK (abnormal_flag IN ('NORMAL','LOW','HIGH','CRITICAL')),
      notes TEXT,
      verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      verified_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_lab_results_order ON lab_results(lab_order_id);

    CREATE TABLE IF NOT EXISTS beds (
      id TEXT PRIMARY KEY,
      facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      ward TEXT,
      bed_number TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'GENERAL' CHECK (type IN (
        'GENERAL','ICU','VENTILATOR','PEDIATRIC','MATERNITY','EMERGENCY'
      )),
      status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN (
        'AVAILABLE','OCCUPIED','RESERVED','MAINTENANCE'
      )),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (facility_id, bed_number)
    );
    CREATE INDEX IF NOT EXISTS idx_beds_facility ON beds(facility_id);
    CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);
    CREATE INDEX IF NOT EXISTS idx_beds_type ON beds(type);

    CREATE TABLE IF NOT EXISTS bed_allocations (
      id TEXT PRIMARY KEY,
      bed_id TEXT NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      referral_id TEXT REFERENCES referrals(id) ON DELETE SET NULL,
      allocated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      allocated_at TEXT NOT NULL,
      released_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bed_alloc_bed ON bed_allocations(bed_id);
    CREATE INDEX IF NOT EXISTS idx_bed_alloc_patient ON bed_allocations(patient_id);
  `);

  // A bed can have at most one live allocation. This is the database-level
  // guarantee behind the transactional double-allocation check.
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bed_alloc_active
      ON bed_allocations(bed_id) WHERE released_at IS NULL;
  `);
}
