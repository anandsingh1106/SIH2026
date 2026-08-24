import fs from 'fs';
import crypto from 'crypto';
import { env } from '../src/config/env.js';
import { getDb, closeDb } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrator.js';
import { signToken } from '../src/services/tokenService.js';

/** Drops and rebuilds the test database from migrations. */
export async function resetTestDb() {
  closeDb();
  for (const suffix of ['', '-wal', '-shm']) {
    const file = env.DATABASE_PATH + suffix;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  getDb();
  await runMigrations({ silent: true });
}

const now = () => new Date().toISOString();

export function createFacility(overrides = {}) {
  const db = getDb();
  const id = overrides.id || `fac-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO facilities (id, name, type, district, active, emergency_available, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, 0, ?, ?)
  `).run(id, overrides.name || 'Test Facility', overrides.type || 'PHC',
         overrides.district || 'Pune', now(), now());
  return db.prepare('SELECT * FROM facilities WHERE id = ?').get(id);
}

let phoneCounter = 0;

export function createUser(overrides = {}) {
  const db = getDb();
  const id = overrides.id || `usr-${crypto.randomUUID()}`;
  const phone = overrides.phone || `+9199000${String(phoneCounter++).padStart(5, '0')}`;

  db.prepare(`
    INSERT INTO users (id, name, phone, email, role, status, district, taluka, village,
                       abha_id, facility_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    overrides.name || 'Test User',
    phone,
    overrides.email ?? null,
    overrides.role || 'PATIENT',
    overrides.status || 'ACTIVE',
    overrides.district ?? 'Pune',
    overrides.taluka ?? null,
    overrides.village ?? null,
    overrides.abhaId ?? null,
    overrides.facilityId ?? null,
    now(),
    now()
  );

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function createPatient(overrides = {}) {
  const db = getDb();
  const id = overrides.id || `pat-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO patients (id, user_id, name, phone, district, assigned_asha_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    overrides.userId ?? null,
    overrides.name || 'Test Patient',
    overrides.phone ?? null,
    overrides.district ?? 'Pune',
    overrides.assignedAshaId ?? null,
    now(),
    now()
  );
  return db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
}

export function createAppointment(overrides = {}) {
  const db = getDb();
  const id = overrides.id || `apt-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO appointments (id, patient_id, doctor_id, facility_id, specialty,
                              appointment_date, appointment_time, type, status,
                              reason, token_number, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    overrides.patientId,
    overrides.doctorId ?? null,
    overrides.facilityId ?? null,
    overrides.specialty ?? 'General Medicine',
    overrides.date || '2026-12-01',
    overrides.time || '10:00',
    overrides.type || 'IN_PERSON',
    overrides.status || 'BOOKED',
    overrides.reason ?? null,
    overrides.tokenNumber ?? 1,
    now(),
    now()
  );
  return db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
}

/** Cookie header string that authenticates as the given user. */
export function authCookie(user) {
  return `token=${signToken(user)}`;
}
