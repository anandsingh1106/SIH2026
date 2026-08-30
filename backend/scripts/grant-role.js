import 'dotenv/config';
import readline from 'readline';
import { getDb } from '../src/db/connection.js';
import { recordAudit } from '../src/services/auditService.js';

/**
 * Grants a role from the command line.
 *
 * This exists because public signup can only ever create a PATIENT, which is
 * what stops anyone on the internet registering as an administrator. That
 * leaves a chicken-and-egg problem at launch: the first admin has to come from
 * somewhere, and it must not be an internet-reachable path.
 *
 * Running this requires shell access to the deployment and its database, so it
 * cannot be triggered by a stranger. Use it once at launch; after that, admins
 * approve each other through the review queue, which leaves a better audit
 * trail because it names both parties.
 *
 * Usage:
 *   node scripts/grant-role.js --email you@example.com --role ADMIN
 *   node scripts/grant-role.js --email x@y.com --role DOCTOR --facility "PHC Paud"
 *   node scripts/grant-role.js --list-admins
 *   node scripts/grant-role.js --email x@y.com --role ADMIN --yes   # skip prompt
 */

const ROLES = ['PATIENT', 'ASHA', 'DOCTOR', 'SPECIALIST', 'ADMIN'];

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

const db = getDb();

if (args.includes('--list-admins')) {
  const admins = db
    .prepare("SELECT name, email, status, mfa_enrolled_at FROM users WHERE role = 'ADMIN' ORDER BY name")
    .all();

  if (!admins.length) {
    console.log('No administrators exist yet.');
    console.log('Create one with: node scripts/grant-role.js --email you@example.com --role ADMIN');
  } else {
    console.log(`${admins.length} administrator(s):\n`);
    for (const a of admins) {
      const mfa = a.mfa_enrolled_at ? '2FA enrolled' : '2FA NOT enrolled';
      console.log(`  ${(a.email || a.name).padEnd(38)} ${a.status.padEnd(9)} ${mfa}`);
    }
  }
  process.exit(0);
}

const email = flag('email');
const role = flag('role')?.toUpperCase();
const facilityName = flag('facility');

if (!email || !role) {
  console.error('Usage: node scripts/grant-role.js --email <email> --role <ROLE>');
  console.error(`Roles: ${ROLES.join(', ')}`);
  console.error('       node scripts/grant-role.js --list-admins');
  process.exit(1);
}

if (!ROLES.includes(role)) {
  console.error(`Unknown role "${role}". Expected one of: ${ROLES.join(', ')}`);
  process.exit(1);
}

const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

if (!user) {
  console.error(`No account found for ${email}.`);
  console.error('The person must sign up through the app first; this promotes an existing account.');
  process.exit(1);
}

let facilityId = user.facility_id;
if (facilityName) {
  const facility = db
    .prepare('SELECT id, name FROM facilities WHERE name = ? AND active = 1')
    .get(facilityName);

  if (!facility) {
    console.error(`No active facility named "${facilityName}".`);
    process.exit(1);
  }
  facilityId = facility.id;
}

function apply() {
  const ts = new Date().toISOString();
  db.prepare('UPDATE users SET role = ?, facility_id = ?, updated_at = ? WHERE id = ?')
    .run(role, facilityId ?? null, ts, user.id);

  // actorId is null: this was done from the server console, not by a signed-in
  // user, and recording a fake actor would be worse than recording none.
  recordAudit({
    actorId: null,
    action: 'ROLE_GRANTED_VIA_CLI',
    entityType: 'user',
    entityId: user.id,
    oldValues: { role: user.role },
    newValues: { role, facilityId: facilityId ?? null },
  });

  console.log(`\n${user.name} (${email})`);
  console.log(`  ${user.role} -> ${role}`);

  if (role !== 'PATIENT') {
    console.log('\nThis role requires two-factor authentication.');
    console.log('They must sign out, sign back in, and complete 2FA setup before');
    console.log('they can reach any patient data.');
  }
}

if (args.includes('--yes')) {
  apply();
  process.exit(0);
}

// Granting ADMIN hands over every patient record in the system, so make the
// operator read what they are about to do.
console.log(`\nAbout to change a role:\n`);
console.log(`  Account:  ${user.name} <${email}>`);
console.log(`  Current:  ${user.role}`);
console.log(`  New:      ${role}`);
if (facilityName) console.log(`  Facility: ${facilityName}`);

if (role === 'ADMIN') {
  console.log('\n  WARNING: an administrator can read every patient record in the');
  console.log('  system, approve other staff, and reset anyone\'s two-factor setup.');
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\nProceed? (yes/no) ', (answer) => {
  rl.close();
  if (answer.trim().toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    process.exit(0);
  }
  apply();
  process.exit(0);
});
