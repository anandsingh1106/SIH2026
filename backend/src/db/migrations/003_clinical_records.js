/**
 * Phase 2 — clinical records: consultations, vitals, medicines, prescriptions,
 * diagnoses and clinical notes.
 */
export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS consultations (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
      facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      chief_complaint TEXT,
      symptoms TEXT,
      examination TEXT,
      diagnosis TEXT,
      icd_code TEXT,
      clinical_notes TEXT,
      treatment_plan TEXT,
      follow_up_date TEXT,
      is_telemedicine INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (status IN ('IN_PROGRESS','COMPLETED','CANCELLED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_consult_patient ON consultations(patient_id);
    CREATE INDEX IF NOT EXISTS idx_consult_doctor ON consultations(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_consult_facility ON consultations(facility_id);
    CREATE INDEX IF NOT EXISTS idx_consult_created ON consultations(created_at);

    CREATE TABLE IF NOT EXISTS vitals (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      consultation_id TEXT REFERENCES consultations(id) ON DELETE SET NULL,
      recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      temperature REAL,
      blood_pressure_systolic INTEGER,
      blood_pressure_diastolic INTEGER,
      heart_rate INTEGER,
      respiratory_rate INTEGER,
      oxygen_saturation INTEGER,
      weight REAL,
      height REAL,
      bmi REAL,
      blood_glucose REAL,
      hemoglobin REAL,
      notes TEXT,
      recorded_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vitals(patient_id);
    CREATE INDEX IF NOT EXISTS idx_vitals_recorded ON vitals(recorded_at);

    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      generic_name TEXT,
      strength TEXT,
      dosage_form TEXT,
      manufacturer TEXT,
      category TEXT,
      is_essential INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
    CREATE INDEX IF NOT EXISTS idx_medicines_generic ON medicines(generic_name);
    CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);

    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      consultation_id TEXT REFERENCES consultations(id) ON DELETE SET NULL,
      facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      diagnosis TEXT,
      instructions TEXT,
      dietary_instructions TEXT,
      follow_up_date TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','DISPENSED','COMPLETED','CANCELLED')),
      issued_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rx_patient ON prescriptions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_rx_doctor ON prescriptions(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_rx_consultation ON prescriptions(consultation_id);
    CREATE INDEX IF NOT EXISTS idx_rx_issued ON prescriptions(issued_at);

    CREATE TABLE IF NOT EXISTS prescription_items (
      id TEXT PRIMARY KEY,
      prescription_id TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
      medicine_id TEXT REFERENCES medicines(id) ON DELETE SET NULL,
      medicine_name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      duration TEXT,
      route TEXT,
      timing TEXT,
      quantity INTEGER,
      instructions TEXT,
      instructions_mr TEXT,
      instructions_hi TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rx_items_rx ON prescription_items(prescription_id);

    CREATE TABLE IF NOT EXISTS diagnoses (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      consultation_id TEXT REFERENCES consultations(id) ON DELETE SET NULL,
      recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      icd_code TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','RESOLVED','RULED_OUT')),
      diagnosed_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_diagnoses_patient ON diagnoses(patient_id);

    CREATE TABLE IF NOT EXISTS clinical_notes (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      consultation_id TEXT REFERENCES consultations(id) ON DELETE SET NULL,
      author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      note_type TEXT NOT NULL DEFAULT 'GENERAL',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notes_patient ON clinical_notes(patient_id);
  `);
}
