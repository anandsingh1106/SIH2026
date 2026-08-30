import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { getDb } from '../src/db/connection.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { generateTotp } from '../src/utils/totp.js';

/**
 * Creates one pre-confirmed demo account per role, for prototype walkthroughs.
 *
 * Accounts are created with email_confirm: true via the admin API, so no
 * confirmation email is sent and Supabase's email rate limit never applies.
 *
 * Re-running is safe: existing accounts are reset to the known password rather
 * than duplicated.
 *
 * Usage: node scripts/create-demo-accounts.js
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

// Staff roles cannot reach patient data without a second factor, so a demo
// account is useless until one exists. Enrolling a real factor here — and
// keeping its secret — leaves the control fully enforced while staying
// demonstrable. Enrolment is user-scoped, so it needs the anon key.
const MFA_ROLES = ['ASHA', 'DOCTOR', 'SPECIALIST', 'ADMIN'];
const WITH_MFA = Boolean(ANON);

if (!SUPABASE_URL || !SERVICE) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
  process.exit(1);
}

/**
 * One shared password keeps the demo simple to present.
 *
 * Not hardcoded: a committed password would let anyone with the repository log
 * into a live project. Set DEMO_PASSWORD in backend/.env to control it;
 * otherwise a random one is generated and written to DEMO_ACCOUNTS.md.
 */
const PASSWORD =
  process.env.DEMO_PASSWORD ||
  `Demo@${crypto.randomBytes(4).toString('hex')}`;

const ACCOUNTS = [
  {
    email: 'demo.patient@arogyasetu.test', role: 'PATIENT', apiRole: 'patient',
    name: 'Ramesh Patil', district: 'Pune', taluka: 'Mulshi', village: 'Paud',
    abhaId: '91-0000-0000-0001',
    shows: 'Own health records, appointments, prescriptions, lab reports',
  },
  {
    email: 'demo.asha@arogyasetu.test', role: 'ASHA', apiRole: 'asha',
    name: 'Sunita Gaikwad', district: 'Pune', taluka: 'Mulshi', village: 'Paud',
    facilityName: 'Sub-Center Kolvan (Demo)',
    shows: 'Assigned patients only, home visits, tasks, immunisation, maternal care, NCD screening',
  },
  {
    email: 'demo.doctor@arogyasetu.test', role: 'DOCTOR', apiRole: 'doctor',
    name: 'Dr. Rajesh Deshmukh', district: 'Pune', taluka: 'Mulshi',
    facilityName: 'PHC Paud (Demo)',
    shows: 'OPD queue, consultations, prescriptions, lab orders, referrals out',
  },
  {
    email: 'demo.specialist@arogyasetu.test', role: 'SPECIALIST', apiRole: 'specialist',
    name: 'Dr. Priya Kulkarni', district: 'Pune', taluka: 'Haveli',
    facilityName: 'B.J. Medical College & Sassoon Hospital (Demo)',
    shows: 'Incoming referral queue, bed allocation, treatment plans, discharge',
  },
  {
    email: 'demo.admin@arogyasetu.test', role: 'ADMIN', apiRole: 'admin',
    name: 'Shri Sanjay Shinde, IAS', district: 'Mumbai City',
    shows: 'Statewide analytics, heatmaps, facilities, staff, inventory, audit logs',
  },
];

const authHeaders = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  'Content-Type': 'application/json',
};

async function findAuthUser(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers: authHeaders });
  const body = await res.json();
  return (body.users || []).find((u) => u.email === email) || null;
}

async function upsertAuthUser(account) {
  const existing = await findAuthUser(account.email);

  if (existing) {
    // Reset to the documented password so the demo always works.
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { name: account.name, role: account.apiRole },
      }),
    });
    if (!res.ok) throw new Error(`reset failed: ${await res.text()}`);
    return { id: existing.id, created: false };
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      email: account.email,
      password: PASSWORD,
      // Skips the confirmation email entirely — no rate limit involved.
      email_confirm: true,
      user_metadata: { name: account.name, role: account.apiRole },
    }),
  });
  if (!res.ok) throw new Error(`create failed: ${await res.text()}`);
  const body = await res.json();
  return { id: body.id, created: true };
}

/**
 * Enrols a TOTP factor and returns its secret.
 *
 * Signs in as the account, because enrolling a factor is something only the
 * user themselves can do — the service-role key cannot. Supabase generates the
 * secret; we capture it so `npm run demo:code` can produce a valid code.
 */
/**
 * Reads a previously issued secret from DEMO_ACCOUNTS.md, if one is recorded.
 *
 * Parsed line-by-line rather than with one large regex: the table rows are a
 * fixed shape, and splitting on the pipe is far easier to read than an
 * expression escaping backticks and the email itself.
 */
function knownSecret(email) {
  const docPath = path.resolve(__dirname, '../../DEMO_ACCOUNTS.md');
  if (!fs.existsSync(docPath)) return null;

  const target = email.trim().toLowerCase();

  for (const line of fs.readFileSync(docPath, 'utf8').split('\n')) {
    if (!line.startsWith('|')) continue;

    // | ROLE | `email` | `SECRET` |
    const cells = line.split('|').map((c) => c.trim().replace(/`/g, ''));
    if (cells.length < 5) continue;

    const [, , rowEmail, secret] = cells;
    if (rowEmail.toLowerCase() === target && /^[A-Z2-7]{16,}$/.test(secret)) {
      return secret;
    }
  }

  return null;
}

async function preEnrolTotp(account, authUserId) {
  const user = createClient(SUPABASE_URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInError } = await user.auth.signInWithPassword({
    email: account.email,
    password: PASSWORD,
  });
  if (signInError) throw new Error(`sign-in: ${signInError.message}`);

  // Reuse the factor from a previous run when its secret is still on record:
  // re-enrolling would invalidate any authenticator app already holding it.
  const { data: existing } = await user.auth.mfa.listFactors();
  const currentFactor = existing?.totp?.[0];

  if (currentFactor) {
    const known = knownSecret(account.email);

    if (known) {
      // Prove the secret still matches before keeping it, rather than assuming
      // the file and Supabase are in step.
      const { error } = await user.auth.mfa.challengeAndVerify({
        factorId: currentFactor.id,
        code: generateTotp(known),
      });
      if (!error) {
        await user.auth.signOut();
        return known;
      }
    }

    // No usable secret on record, so the factor is orphaned and must go.
    // A user-scoped unenrol needs an aal2 session, which is unreachable without
    // a working code — but the admin API can remove it outright.
    const admin = createClient(SUPABASE_URL, SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({
      id: currentFactor.id,
      userId: authUserId,
    });
    if (deleteError) throw new Error(`could not remove stale factor: ${deleteError.message}`);
  }

  const { data: enrolment, error: enrolError } = await user.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Demo ${Date.now()}`,
  });
  if (enrolError) throw new Error(`enrol: ${enrolError.message}`);

  const secret = enrolment.totp.secret;

  const { error: verifyError } = await user.auth.mfa.challengeAndVerify({
    factorId: enrolment.id,
    code: generateTotp(secret),
  });
  if (verifyError) throw new Error(`verify: ${verifyError.message}`);

  await user.auth.signOut();
  return secret;
}

/** Links the Supabase auth user to a row in the application users table. */
function upsertAppUser(account, authUserId) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(account.email);

  const facilityId = account.facilityName
    ? db.prepare('SELECT id FROM facilities WHERE name = ?').get(account.facilityName)?.id ?? null
    : null;

  if (existing) {
    db.prepare(`
      UPDATE users SET auth_user_id = ?, name = ?, role = ?, district = ?, taluka = ?,
                       village = ?, abha_id = ?, facility_id = ?, status = 'ACTIVE', updated_at = ?
      WHERE email = ?
    `).run(authUserId, account.name, account.role, account.district ?? null,
           account.taluka ?? null, account.village ?? null, account.abhaId ?? null,
           facilityId, new Date().toISOString(), account.email);
    return { created: false, id: existing.id };
  }

  const user = userRepository.create({
    authUserId,
    name: account.name,
    // Phone is unique in the schema; demo accounts sign in by email.
    phone: `demo:${account.apiRole}`,
    email: account.email,
    role: account.role,
    district: account.district,
    taluka: account.taluka,
    village: account.village,
    abhaId: account.abhaId,
    facilityId,
  });
  return { created: true, id: user.id };
}

/**
 * Points the seeded demo data at the new accounts.
 *
 * Without this the dashboards render empty: the seed rows are attached to the
 * placeholder `demo-usr-*` users created by db:seed, not to these login
 * accounts.
 */
function attachSeedData(byRole) {
  const db = getDb();
  const patientUser = byRole.PATIENT;
  const ashaUser = byRole.ASHA;
  const doctorUser = byRole.DOCTOR;

  let changes = [];

  // The patient account owns the first seeded patient record.
  if (patientUser) {
    const own = db.prepare("SELECT id FROM patients WHERE name LIKE 'Demo Patil%'").get();
    if (own) {
      db.prepare('UPDATE patients SET user_id = ?, updated_at = ? WHERE id = ?')
        .run(patientUser.appUserId, new Date().toISOString(), own.id);
      changes.push('patient record linked');
    }
  }

  // Every seeded patient falls under the demo ASHA worker's caseload.
  if (ashaUser) {
    const r = db.prepare('UPDATE patients SET assigned_asha_id = ? WHERE assigned_asha_id IS NOT NULL OR assigned_asha_id IS NULL')
      .run(ashaUser.appUserId);
    changes.push(`${r.changes} patients assigned to ASHA`);
  }

  // Give the doctor a caseload so their dashboard is not empty.
  if (doctorUser) {
    const r = db.prepare('UPDATE appointments SET doctor_id = ? WHERE doctor_id IS NULL')
      .run(doctorUser.appUserId);
    if (r.changes) changes.push(`${r.changes} appointments assigned to doctor`);
  }

  // Sample appointments, so the patient and doctor screens show something.
  if (patientUser && doctorUser) {
    const own = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(patientUser.appUserId);
    const facility = db.prepare("SELECT id FROM facilities WHERE name LIKE 'PHC Paud%'").get();
    const existing = db.prepare('SELECT COUNT(*) AS c FROM appointments WHERE patient_id = ?')
      .get(own?.id ?? '').c;

    if (own && existing === 0) {
      const today = new Date();
      const plus = (days) => {
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0, 10);
      };

      const rows = [
        { date: plus(3), time: '10:30', status: 'BOOKED', reason: 'Follow-up: hypertension review', type: 'IN_PERSON' },
        { date: plus(10), time: '15:00', status: 'BOOKED', reason: 'Cardiology tele-consultation', type: 'TELEMEDICINE' },
        { date: plus(-14), time: '09:00', status: 'COMPLETED', reason: 'Routine check-up and lab orders', type: 'IN_PERSON' },
      ];

      const insert = db.prepare(`
        INSERT INTO appointments (id, patient_id, doctor_id, facility_id, specialty,
          appointment_date, appointment_time, type, status, reason, token_number,
          created_at, updated_at)
        VALUES (?, ?, ?, ?, 'General Medicine', ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      rows.forEach((r, i) => {
        const now = new Date().toISOString();
        insert.run(crypto.randomUUID(), own.id, doctorUser.appUserId, facility?.id ?? null,
                   r.date, r.time, r.type, r.status, r.reason, i + 1, now, now);
      });

      changes.push(`${rows.length} sample appointments created`);
    }
  }

  return changes;
}

console.log('Creating demo accounts...\n');

const results = [];

for (const account of ACCOUNTS) {
  process.stdout.write(`  ${account.role.padEnd(11)} ${account.email.padEnd(38)} `);
  try {
    const auth = await upsertAuthUser(account);
    const app = upsertAppUser(account, auth.id);

    let totpSecret = null;
    if (WITH_MFA && MFA_ROLES.includes(account.role)) {
      try {
        totpSecret = await preEnrolTotp(account, auth.id);
        getDb()
          .prepare('UPDATE users SET mfa_enrolled_at = ?, updated_at = ? WHERE id = ?')
          .run(new Date().toISOString(), new Date().toISOString(), app.id);
      } catch (err) {
        // Not fatal: the account still works, the user just completes the
        // normal 2FA setup screen at first sign-in.
        process.stdout.write(`(2FA failed: ${err.message}) `);
      }
    }

    console.log(`${auth.created ? 'created' : 'updated'}${totpSecret ? ' +2FA' : ''}`);
    results.push({ ...account, authUserId: auth.id, appUserId: app.id, totpSecret });
  } catch (err) {
    console.log(`FAILED — ${err.message}`);
    process.exitCode = 1;
  }
}

const byRole = Object.fromEntries(results.map((r) => [r.role, r]));
const linked = attachSeedData(byRole);
if (linked.length) {
  console.log(`\nSeed data linked: ${linked.join(', ')}`);
}

// ─── Write the credentials file used during the demo ────────────────────────

const md = `# Demo Accounts — MahaAarogya Sangam

Pre-confirmed accounts for demonstrating role-based access control.
Regenerate at any time with:

\`\`\`bash
cd backend && npm run demo:accounts
\`\`\`

**Shared password for every account:** \`${PASSWORD}\`

> These are demo credentials on a development project. Do not reuse this
> password for anything real, and remove these accounts before any public
> deployment.

## Accounts

| Role | Email | Password | 2FA | Lands on |
| --- | --- | --- | --- | --- |
${results.map((r) => `| **${r.role}** | \`${r.email}\` | \`${PASSWORD}\` | ${r.totpSecret ? 'required' : 'not needed'} | \`/${r.apiRole}/dashboard\` |`).join('\n')}

## Two-factor codes

Staff roles (ASHA, DOCTOR, SPECIALIST, ADMIN) cannot reach patient data without
a second factor — the API enforces it, so a demo behaves exactly as production
would. Each staff account already has a real TOTP factor enrolled; get a valid
code with:

\`\`\`bash
cd backend && npm run demo:code -- demo.doctor@arogyasetu.test
\`\`\`

Or add the secret below to any authenticator app using "enter a setup key".

| Role | Email | TOTP secret |
| --- | --- | --- |
${results.filter((r) => r.totpSecret).map((r) => `| ${r.role} | \`${r.email}\` | \`${r.totpSecret}\` |`).join('\n') || '| — | _none enrolled_ | — |'}

## What each role can see

${results.map((r) => `### ${r.role} — ${r.name}
${r.facilityName ? `Facility: ${r.facilityName}  \n` : ''}${r.district ? `District: ${r.district}  \n` : ''}
${r.shows}
`).join('\n')}

## Demonstrating access control

A good sequence for showing that authorization is real, not cosmetic:

1. **Sign in as PATIENT** — note they see only their own records.
2. **Sign in as ASHA** — only patients assigned to this worker appear.
3. **Sign in as DOCTOR** — clinical tools appear; try opening an admin URL
   such as \`/admin/dashboard\` directly and the route guard redirects away.
4. **Sign in as SPECIALIST** — the incoming referral queue and bed desk.
5. **Sign in as ADMIN** — statewide analytics and the audit log.

The database enforces the same rules independently of the interface. To show
that, run:

\`\`\`bash
cd backend && npm run supabase:rls-test
\`\`\`

It proves Patient A cannot read Patient B's records, cannot modify them, and
cannot escalate their own role — checked directly against PostgreSQL.

## Notes

- Accounts are created with \`email_confirm: true\`, so no confirmation email is
  sent and Supabase's email rate limit does not apply.
- Re-running the script resets the passwords rather than creating duplicates.
- Demo emails use the \`.test\` TLD, which is reserved and cannot receive mail —
  deliberate, so these can never be mistaken for real accounts.
- The PATIENT account needs no second factor: a patient reaches only their own
  record, so 2FA is optional for that role.
- Re-running the script re-enrols the TOTP factors, which invalidates the
  secrets listed above and writes fresh ones.
`;

const outPath = path.resolve(__dirname, '../../DEMO_ACCOUNTS.md');
fs.writeFileSync(outPath, md);

// Hand the secrets to the dev server so the sign-in screen can pre-fill the
// code during a walkthrough. .env.local is gitignored, and the frontend reads
// it only under import.meta.env.DEV, so it cannot reach a production build.
const withSecrets = results.filter((r) => r.totpSecret);

if (withSecrets.length) {
  const line = `VITE_DEMO_TOTP_SECRETS=${withSecrets.map((r) => `${r.email}:${r.totpSecret}`).join(',')}`;
  const envLocal = path.resolve(__dirname, '../../frontend/.env.local');

  const existing = fs.existsSync(envLocal) ? fs.readFileSync(envLocal, 'utf8') : '';
  const kept = existing
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('VITE_DEMO_TOTP_SECRETS='));

  fs.writeFileSync(envLocal, [...kept, line, ''].join('\n'));
  console.log('\nDemo 2FA codes will auto-fill on the sign-in screen (dev only).');
  console.log('  Restart the dev server to pick them up.');
}
console.log(`\nCredentials written to DEMO_ACCOUNTS.md`);
console.log(`Password for every account: ${PASSWORD}`);
