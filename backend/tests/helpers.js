import fs from 'fs';
import crypto from 'crypto';
import { env } from '../src/config/env.js';
import { getDb, closeDb } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrator.js';
import supertest from 'supertest';
import { signToken } from '../src/services/tokenService.js';
import { CSRF_COOKIE, CSRF_HEADER } from '../src/middleware/csrf.js';
import { MFA_REQUIRED_ROLES } from '../src/services/mfaService.js';

// Fixed value so tests can set a matching header without parsing cookies.
export const CSRF_TEST_TOKEN = 'test-csrf-token';

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

  const role = overrides.role || 'PATIENT';

  // Staff roles cannot operate without 2FA in production, so the default here
  // mirrors that: an enrolled staff account is the normal case these suites
  // exercise. Pass `mfaEnrolled: false` to test the enrolment gate itself.
  const mfaEnrolled = overrides.mfaEnrolled ?? MFA_REQUIRED_ROLES.includes(role);

  db.prepare(`
    INSERT INTO users (id, name, phone, email, role, status, district, taluka, village,
                       abha_id, facility_id, mfa_enrolled_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    overrides.name || 'Test User',
    phone,
    overrides.email ?? null,
    role,
    overrides.status || 'ACTIVE',
    overrides.district ?? 'Pune',
    overrides.taluka ?? null,
    overrides.village ?? null,
    overrides.abhaId ?? null,
    overrides.facilityId ?? null,
    mfaEnrolled ? now() : null,
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

/**
 * Cookie header that authenticates as the given user.
 *
 * Includes a CSRF cookie matching CSRF_TEST_TOKEN, mirroring what a real
 * browser holds after signing in. Pair it with `csrfHeaders()` on writes.
 */
export function authCookie(user, { mfaSatisfied = true } = {}) {
  return `token=${signToken(user, { mfaSatisfied })}; ${CSRF_COOKIE}=${CSRF_TEST_TOKEN}`;
}

/**
 * A password-only session, for asserting that the two-factor gate blocks it.
 * The default above is aal2 so the other suites can test business logic
 * without every request having to re-establish a second factor.
 */
export function passwordOnlyCookie(user) {
  return authCookie(user, { mfaSatisfied: false });
}

/** The CSRF header a write must carry to match `authCookie`. */
export function csrfHeaders() {
  return { [CSRF_HEADER]: CSRF_TEST_TOKEN };
}

/**
 * supertest wrapper that mirrors browser CSRF behaviour.
 *
 * A real browser automatically holds both the session and CSRF cookies and the
 * frontend echoes the token back on writes. Reproducing that by hand at every
 * call site would add noise to 160-odd assertions, so the header is attached
 * here whenever a request carries our CSRF cookie.
 *
 * The middleware itself is still tested directly, with no wrapper involved, in
 * security.test.js — so this convenience cannot mask a regression in it.
 */
export function request(app) {
  const agent = supertest(app);

  return new Proxy(agent, {
    get(target, method) {
      const original = target[method];
      if (typeof original !== 'function') return original;

      return (...args) => {
        const test = original.apply(target, args);
        const originalSet = test.set.bind(test);

        test.set = (field, value) => {
          const result = originalSet(field, value);
          if (
            typeof field === 'string' &&
            field.toLowerCase() === 'cookie' &&
            String(value).includes(`${CSRF_COOKIE}=${CSRF_TEST_TOKEN}`)
          ) {
            originalSet(CSRF_HEADER, CSRF_TEST_TOKEN);
          }
          return result;
        };

        return test;
      };
    },
  });
}
