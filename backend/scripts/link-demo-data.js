import 'dotenv/config';
import { getDb, transaction } from '../src/db/connection.js';

/**
 * Repoints demo data from the seed placeholder users onto the real login
 * accounts, then removes the placeholders.
 *
 * db:seed creates users with @example.invalid addresses that cannot sign in.
 * demo:accounts creates the real @arogyasetu.test accounts. Without this step
 * the generated records attach to the placeholders and the dashboards look
 * empty after logging in.
 *
 * Idempotent: safe to run repeatedly.
 *
 * Usage: node scripts/link-demo-data.js
 */

const db = getDb();

const ROLES = ['PATIENT', 'ASHA', 'DOCTOR', 'SPECIALIST', 'ADMIN'];

// Columns that reference a user, by table.
const USER_REFS = [
  ['patients', 'assigned_asha_id'], ['patients', 'user_id'],
  ['appointments', 'doctor_id'],
  ['consultations', 'doctor_id'],
  ['prescriptions', 'doctor_id'],
  ['referrals', 'referred_by'], ['referrals', 'referred_to'],
  ['referral_events', 'actor_id'],
  ['lab_orders', 'doctor_id'], ['lab_results', 'verified_by'],
  ['home_visits', 'asha_id'],
  ['tasks', 'assigned_to'], ['tasks', 'created_by'],
  ['vaccinations', 'administered_by'],
  ['maternal_records', 'asha_id'], ['anc_visits', 'recorded_by'],
  ['ncd_screenings', 'screened_by'],
  ['vitals', 'recorded_by'],
  ['opd_tokens', 'doctor_id'],
  ['bed_allocations', 'allocated_by'],
  ['allergies', 'recorded_by'], ['chronic_conditions', 'recorded_by'],
  ['notifications', 'user_id'],
  ['audit_logs', 'actor_id'],
];

const moved = [];

transaction(() => {
  for (const role of ROLES) {
    const placeholder = db
      .prepare("SELECT id FROM users WHERE role = ? AND email LIKE '%@example.invalid'")
      .get(role);
    const real = db
      .prepare("SELECT id FROM users WHERE role = ? AND email LIKE '%@arogyasetu.test'")
      .get(role);

    if (!placeholder || !real || placeholder.id === real.id) continue;

    let total = 0;
    for (const [table, column] of USER_REFS) {
      try {
        const r = db.prepare(`UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`)
          .run(real.id, placeholder.id);
        total += r.changes ?? 0;
      } catch {
        // Table or column absent in this schema version — skip it.
      }
    }

    // The placeholder is now unreferenced and would otherwise clutter staff
    // lists and analytics counts.
    db.prepare('DELETE FROM users WHERE id = ?').run(placeholder.id);
    moved.push(`${role}: ${total} references moved`);
  }
});

console.log('Linking demo data to login accounts\n');
moved.forEach((m) => console.log(`  ${m}`));
if (moved.length === 0) console.log('  nothing to move — already linked');

console.log('\nCaseloads now:');
for (const role of ROLES) {
  const u = db.prepare("SELECT id, name FROM users WHERE role = ? AND email LIKE '%@arogyasetu.test'").get(role);
  if (!u) continue;
  const counts = {
    PATIENT: () => db.prepare('SELECT COUNT(*) c FROM patients WHERE user_id = ?').get(u.id).c,
    ASHA: () => db.prepare('SELECT COUNT(*) c FROM patients WHERE assigned_asha_id = ?').get(u.id).c,
    DOCTOR: () => db.prepare('SELECT COUNT(*) c FROM consultations WHERE doctor_id = ?').get(u.id).c,
    SPECIALIST: () => db.prepare('SELECT COUNT(*) c FROM referrals WHERE referred_to = ?').get(u.id).c,
    ADMIN: () => db.prepare('SELECT COUNT(*) c FROM patients').get().c,
  };
  const label = { PATIENT: 'own records', ASHA: 'assigned patients', DOCTOR: 'consultations',
                  SPECIALIST: 'referrals', ADMIN: 'all patients' }[role];
  console.log(`  ${role.padEnd(11)} ${String(counts[role]()).padStart(4)} ${label}`);
}
