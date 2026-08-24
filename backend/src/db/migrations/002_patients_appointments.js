/**
 * Phase 2 — patients, family relationships and appointments.
 *
 * The legacy `patients` table stored whole records as a JSON blob and the
 * legacy `appointments` table had no foreign keys. Both are replaced with
 * relational tables. Legacy appointment rows are migrated across; legacy
 * JSON-blob patients are demo seed data and are dropped (reseeded later).
 */
export function up(db) {
  // The legacy `patients` table stored records as a JSON blob (id, data) and
  // held only demo seed rows. Drop it so the relational table can take its
  // place; equivalent demo data is reinstated by the seed script.
  const legacyPatients = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='patients'")
    .get();
  if (legacyPatients) {
    const cols = db.prepare('PRAGMA table_info(patients)').all().map((c) => c.name);
    const isJsonBlobTable = cols.includes('data') && !cols.includes('name');
    if (isJsonBlobTable) {
      db.exec('DROP TABLE patients;');
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      abha_id TEXT UNIQUE,
      name TEXT NOT NULL,
      date_of_birth TEXT,
      gender TEXT CHECK (gender IN ('MALE','FEMALE','OTHER')),
      phone TEXT,
      address TEXT,
      district TEXT,
      taluka TEXT,
      village TEXT,
      blood_group TEXT,
      emergency_contact TEXT,
      emergency_contact_phone TEXT,
      assigned_asha_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_patients_user ON patients(user_id);
    CREATE INDEX IF NOT EXISTS idx_patients_district ON patients(district);
    CREATE INDEX IF NOT EXISTS idx_patients_village ON patients(village);
    CREATE INDEX IF NOT EXISTS idx_patients_asha ON patients(assigned_asha_id);
    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
    CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

    CREATE TABLE IF NOT EXISTS allergies (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      substance TEXT NOT NULL,
      reaction TEXT,
      severity TEXT CHECK (severity IN ('MILD','MODERATE','SEVERE')),
      recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_allergies_patient ON allergies(patient_id);

    CREATE TABLE IF NOT EXISTS chronic_conditions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      condition TEXT NOT NULL,
      diagnosed_date TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RESOLVED','MANAGED')),
      notes TEXT,
      recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chronic_patient ON chronic_conditions(patient_id);

    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      related_patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      name TEXT,
      relationship TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (patient_id, related_patient_id, relationship)
    );
    CREATE INDEX IF NOT EXISTS idx_family_patient ON family_members(patient_id);
  `);

  // --- appointments -------------------------------------------------------
  const hasAppointments = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'")
    .get();

  const legacyAppointments = hasAppointments
    ? db.prepare('SELECT * FROM appointments').all()
    : [];

  if (hasAppointments) {
    db.exec('ALTER TABLE appointments RENAME TO _appointments_old;');
  }

  db.exec(`
    CREATE TABLE appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      specialty TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'IN_PERSON' CHECK (type IN ('IN_PERSON','TELEMEDICINE')),
      status TEXT NOT NULL DEFAULT 'BOOKED' CHECK (status IN (
        'BOOKED','CONFIRMED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW'
      )),
      reason TEXT,
      token_number INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_appt_doctor ON appointments(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_appt_facility ON appointments(facility_id);
    CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appt_status ON appointments(status);
  `);

  // Prevents two patients holding the same doctor/date/time slot. Cancelled and
  // no-show appointments free the slot, so they are excluded from the index.
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_appt_slot_unique
      ON appointments(doctor_id, appointment_date, appointment_time)
      WHERE doctor_id IS NOT NULL AND status NOT IN ('CANCELLED','NO_SHOW');
  `);

  // Legacy rows referenced users.id via patient_id and had no patients row.
  // Create a minimal patient record for each so the foreign key holds.
  if (legacyAppointments.length > 0) {
    const findUser = db.prepare('SELECT * FROM users WHERE id = ?');
    const findPatientByUser = db.prepare('SELECT id FROM patients WHERE user_id = ?');
    const insertPatient = db.prepare(`
      INSERT INTO patients (id, user_id, name, phone, district, taluka, village, abha_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertAppt = db.prepare(`
      INSERT INTO appointments (id, patient_id, specialty, appointment_date, appointment_time,
                                type, status, reason, token_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const a of legacyAppointments) {
      const user = findUser.get(a.patient_id);
      if (!user) continue; // orphaned row — drop it

      let patientId = findPatientByUser.get(user.id)?.id;
      if (!patientId) {
        patientId = `pat-${user.id}`;
        insertPatient.run(
          patientId,
          user.id,
          user.name,
          user.phone ?? null,
          user.district ?? null,
          user.taluka ?? null,
          user.village ?? null,
          user.abha_id ?? null,
          user.created_at || new Date().toISOString(),
          new Date().toISOString()
        );
      }

      const type = a.type === 'telemedicine' ? 'TELEMEDICINE' : 'IN_PERSON';
      const status =
        a.status === 'cancelled' ? 'CANCELLED'
        : a.status === 'completed' ? 'COMPLETED'
        : 'BOOKED';

      insertAppt.run(
        a.id,
        patientId,
        a.specialty ?? null,
        a.date,
        a.time,
        type,
        status,
        a.reason ?? null,
        a.token_number ?? null,
        a.created_at || new Date().toISOString(),
        a.updated_at || new Date().toISOString()
      );
    }
  }

  if (hasAppointments) {
    db.exec('DROP TABLE _appointments_old;');
  }

  // Legacy JSON-blob demo tables are superseded by the relational schema.
  db.exec('DROP TABLE IF EXISTS prescriptions;');
}
