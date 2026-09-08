import 'dotenv/config';
import { getDb, transaction } from '../src/db/connection.js';

/**
 * Repairs demo data that earlier seed runs left incomplete.
 *
 * Two problems this fixes:
 *   1. Appointments seeded before the demo login accounts existed have a NULL
 *      doctor_id. listAppointments scopes clinicians to their own bookings, so
 *      those rows are invisible to every role except ADMIN.
 *   2. The @example.invalid placeholder users linger after demo:link has
 *      already moved their references, inflating staff counts in analytics.
 *
 * idx_appt_slot_unique forbids double-booking one clinician, so rows are moved
 * onto free slots rather than forced onto whatever time they already carry.
 *
 * Idempotent: safe to run repeatedly.
 *
 * Usage: node scripts/repair-demo-data.js
 */

const db = getDb();

const real = (role) =>
  db.prepare("SELECT id, facility_id FROM users WHERE role = ? AND email LIKE '%@arogyasetu.test'").get(role);

const doctor = real('DOCTOR');
const specialist = real('SPECIALIST');

if (!doctor || !specialist) {
  console.error('Demo login accounts missing — run `npm run demo:accounts` first.');
  process.exit(1);
}

// The unique index ignores cancelled and no-show rows, so only live bookings
// occupy a slot.
const ACTIVE = "status NOT IN ('CANCELLED','NO_SHOW')";

const taken = new Set(
  db.prepare(`SELECT doctor_id, appointment_date, appointment_time FROM appointments
              WHERE doctor_id IS NOT NULL AND ${ACTIVE}`)
    .all()
    .map((r) => `${r.doctor_id}|${r.appointment_date}|${r.appointment_time}`)
);

/** First free 10-minute slot in clinic hours for this doctor on this date. */
function freeSlot(doctorId, date) {
  for (let h = 9; h < 17; h++) {
    for (let m = 0; m < 60; m += 10) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (!taken.has(`${doctorId}|${date}|${time}`)) return time;
    }
  }
  return null;
}

const assigned = { specialist: 0, doctor: 0 };
let skipped = 0;
let placeholdersRemoved = 0;

transaction(() => {
  const orphans = db
    .prepare('SELECT id, facility_id, appointment_date, appointment_time, status FROM appointments WHERE doctor_id IS NULL ORDER BY appointment_date, appointment_time')
    .all();

  const update = db.prepare('UPDATE appointments SET doctor_id = ?, appointment_time = ? WHERE id = ?');

  for (const appt of orphans) {
    // Appointments at the specialist's own hospital belong to them; the rest
    // sit with the PHC doctor, matching how seed-scale assigns new rows.
    const isSpecialist = appt.facility_id === specialist.facility_id;
    const owner = isSpecialist ? specialist : doctor;

    // Cancelled and no-show rows sit outside the unique index, so they keep
    // their original time.
    const live = appt.status !== 'CANCELLED' && appt.status !== 'NO_SHOW';
    let time = appt.appointment_time;

    if (live) {
      const key = `${owner.id}|${appt.appointment_date}|${time}`;
      if (taken.has(key)) time = freeSlot(owner.id, appt.appointment_date);
      if (!time) { skipped++; continue; }
      taken.add(`${owner.id}|${appt.appointment_date}|${time}`);
    }

    update.run(owner.id, time, appt.id);
    assigned[isSpecialist ? 'specialist' : 'doctor']++;
  }

  // Referrals with no destination cannot appear in the specialist's queue.
  db.prepare(`UPDATE referrals SET referred_to = ? WHERE referred_to IS NULL AND status != 'COMPLETED'`)
    .run(specialist.id);

  // demo:link repoints references off the placeholders but leaves the rows
  // behind when it has already run once. They still count as ACTIVE staff.
  placeholdersRemoved = db
    .prepare("DELETE FROM users WHERE email LIKE '%@example.invalid'")
    .run().changes ?? 0;
});

console.log('Repairing demo data\n');
console.log(`  appointments -> specialist   : ${assigned.specialist}`);
console.log(`  appointments -> doctor       : ${assigned.doctor}`);
if (skipped) console.log(`  skipped (no free slot)       : ${skipped}`);
console.log(`  placeholder users removed    : ${placeholdersRemoved}`);
console.log(`  appointments still unassigned: ${db.prepare('SELECT COUNT(*) c FROM appointments WHERE doctor_id IS NULL').get().c}`);
