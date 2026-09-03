import crypto from 'crypto';
import { getDb, transaction } from './connection.js';
import { logger } from '../utils/logger.js';

/**
 * Keeps a demo OPD queue available for whatever day the app is opened on.
 *
 * The queue view is scoped to a single date, so tokens seeded on an earlier day
 * leave the desk empty the next morning and there is nothing to walk through.
 * This tops up today's queue at boot so a demo works on any date without
 * anyone re-running a seed script.
 *
 * Only ever touches demo facilities, and never in production.
 */

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

// Enough tokens to show the desk mid-session: one finished, one in the room,
// and a few still waiting to be called.
const SHAPE = ['COMPLETED', 'IN_PROGRESS', 'WAITING', 'WAITING', 'WAITING'];

export function ensureDemoQueueForToday({ silent = false } = {}) {
  const db = getDb();
  const date = today();

  // Demo data hangs off the seeded demo accounts; with none present this is a
  // real deployment and must be left alone.
  const doctor = db
    .prepare("SELECT * FROM users WHERE role = 'DOCTOR' AND email LIKE 'demo.%arogyasetu.test'")
    .get();
  if (!doctor) return { seeded: 0, reason: 'no demo doctor' };

  const facilityId = doctor.facility_id;
  if (!facilityId) return { seeded: 0, reason: 'demo doctor has no facility' };

  const existing = db
    .prepare('SELECT COUNT(*) AS c FROM opd_tokens WHERE facility_id = ? AND queue_date = ?')
    .get(facilityId, date).c;
  if (existing > 0) return { seeded: 0, reason: 'already present' };

  // Reuse the patients the demo doctor can actually open, so every token in the
  // queue leads to a working consultation.
  const patients = db
    .prepare('SELECT id FROM patients ORDER BY created_at LIMIT ?')
    .all(SHAPE.length);
  if (patients.length === 0) return { seeded: 0, reason: 'no patients' };

  const seeded = transaction((tx) => {
    const insert = tx.prepare(`
      INSERT INTO opd_tokens (id, facility_id, patient_id, doctor_id, token_number,
        queue_date, status, called_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    SHAPE.forEach((status, i) => {
      const patient = patients[i % patients.length];
      insert.run(
        crypto.randomUUID(), facilityId, patient.id, doctor.id, i + 1,
        date, status, status === 'WAITING' ? null : now(), now(), now()
      );
    });

    return SHAPE.length;
  });

  if (!silent) logger.info(`Seeded ${seeded} demo OPD tokens for ${date}.`);
  return { seeded, reason: 'seeded' };
}
