import 'dotenv/config';
import crypto from 'crypto';
import { getDb, transaction } from '../src/db/connection.js';

/**
 * Backdates six months of consultations and referrals so the landing-page
 * trend chart is drawn from real rows rather than hardcoded figures.
 *
 * Volumes stay small — this is demo history, not a load test. The shape rises
 * month on month to show adoption, which is the point of the chart.
 *
 * Idempotent: rows carry a marker so re-running does not duplicate them.
 *
 * Usage: node scripts/seed-history.js
 */

const db = getDb();
const uid = () => crypto.randomUUID();
const MARKER = '[demo-history]';

const patients = db.prepare('SELECT * FROM patients').all();
const doctor = db.prepare("SELECT * FROM users WHERE role='DOCTOR' AND email LIKE 'demo.%'").get();
const specialist = db.prepare("SELECT * FROM users WHERE role='SPECIALIST' AND email LIKE 'demo.%'").get();
const phc = db.prepare("SELECT * FROM facilities WHERE name LIKE 'PHC Paud%'").get();
const hospital = db.prepare("SELECT * FROM facilities WHERE name LIKE '%Sassoon%'").get();

if (!patients.length || !doctor) {
  console.error('Run "npm run demo:full" first — demo accounts and patients are required.');
  process.exit(1);
}

const existing = db.prepare(
  `SELECT COUNT(*) c FROM consultations WHERE clinical_notes LIKE ?`
).get(`%${MARKER}%`).c;

if (existing > 0) {
  console.log(`History already seeded (${existing} consultations). Nothing to do.`);
  process.exit(0);
}

// Six months back to last month; the current month already has live rows.
const MONTHS = 6;

// Gentle upward adoption curve.
const CONSULTATIONS_PER_MONTH = [3, 4, 6, 7, 9, 11];
const REFERRALS_PER_MONTH = [1, 1, 2, 2, 3, 4];

const COMPLAINTS = [
  ['Fever and body ache', 'Acute viral fever'],
  ['Cough for two weeks', 'Upper respiratory tract infection'],
  ['Headache and dizziness', 'Essential hypertension'],
  ['Increased thirst and fatigue', 'Type 2 diabetes mellitus — follow-up'],
  ['Joint pain', 'Osteoarthritis'],
  ['Abdominal discomfort', 'Acid peptic disease'],
  ['Routine antenatal visit', 'Antenatal care — uncomplicated'],
  ['Child not gaining weight', 'Growth monitoring'],
];

const SPECIALTIES = ['Cardiology', 'Obstetrics', 'General Surgery', 'Orthopaedics', 'Paediatrics'];
const URGENCIES = ['ROUTINE', 'ROUTINE', 'URGENT', 'ROUTINE', 'EMERGENCY'];

/** A timestamp inside the month that is `monthsAgo` before the current one. */
function dateInMonth(monthsAgo, dayOfMonth) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(Math.min(dayOfMonth, 28));
  d.setHours(9 + (dayOfMonth % 8), 0, 0, 0);
  return d.toISOString();
}

const counts = transaction(() => {
  const insC = db.prepare(`
    INSERT INTO consultations (id, patient_id, doctor_id, facility_id, chief_complaint,
      symptoms, examination, diagnosis, clinical_notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)`);

  const insR = db.prepare(`
    INSERT INTO referrals (id, referral_code, patient_id, referred_by, referred_to,
      source_facility_id, destination_facility_id, specialty, reason, urgency,
      clinical_summary, status, created_at, updated_at, accepted_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)`);

  const insE = db.prepare(`
    INSERT INTO referral_events (id, referral_id, status, actor_id, created_at)
    VALUES (?, ?, ?, ?, ?)`);

  let consultations = 0;
  let referrals = 0;

  // Oldest month first so ids and timestamps stay in order.
  for (let i = 0; i < MONTHS; i++) {
    const monthsAgo = MONTHS - i;

    for (let n = 0; n < CONSULTATIONS_PER_MONTH[i]; n++) {
      const [complaint, diagnosis] = COMPLAINTS[(i + n) % COMPLAINTS.length];
      const patient = patients[(i + n) % patients.length];
      const ts = dateInMonth(monthsAgo, 2 + n * 2);

      insC.run(uid(), patient.id, doctor.id, phc?.id ?? null, complaint,
               JSON.stringify(complaint.toLowerCase().split(' and ')),
               'Examination unremarkable.', diagnosis,
               `Routine follow-up advised. ${MARKER}`, ts, ts);
      consultations++;
    }

    for (let n = 0; n < REFERRALS_PER_MONTH[i]; n++) {
      const patient = patients[(i + n) % patients.length];
      const specialty = SPECIALTIES[(i + n) % SPECIALTIES.length];
      const urgency = URGENCIES[(i + n) % URGENCIES.length];
      const ts = dateInMonth(monthsAgo, 5 + n * 6);
      const accepted = new Date(new Date(ts).getTime() + 2 * 3600_000).toISOString();
      const completed = new Date(new Date(ts).getTime() + 48 * 3600_000).toISOString();
      const rid = uid();

      insR.run(rid, `REF-H-${monthsAgo}${n}${Math.floor(Math.random() * 900 + 100)}`,
               patient.id, doctor.id, specialist?.id ?? null,
               phc?.id ?? null, hospital?.id ?? null, specialty,
               `${specialty} opinion required`, urgency,
               `Referred for ${specialty} evaluation. ${MARKER}`,
               ts, completed, accepted, completed);

      ['CREATED', 'SENT', 'ACCEPTED', 'ARRIVED', 'IN_CONSULTATION', 'COMPLETED']
        .forEach((status, j) => {
          insE.run(uid(), rid, status,
                   j < 2 ? doctor.id : specialist?.id ?? doctor.id,
                   new Date(new Date(ts).getTime() + j * 3600_000).toISOString());
        });
      referrals++;
    }
  }

  return { consultations, referrals };
});

console.log(`Seeded ${MONTHS} months of history:`);
console.log(`  consultations: +${counts.consultations}`);
console.log(`  referrals:     +${counts.referrals}`);
