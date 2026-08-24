import 'dotenv/config';
import pg from 'pg';

/**
 * Proves the RLS policies actually deny cross-patient access.
 *
 * Rather than trusting that the policies exist, this impersonates each role the
 * way PostgREST does — set role authenticated + set request.jwt.claims — and
 * asserts what each one can and cannot see.
 *
 * All test rows are removed afterwards.
 */

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

const q = async (sql, params = []) => (await client.query(sql, params)).rows;

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}

/** Runs a query as a given auth user, the way Supabase does. */
async function asUser(authUid, sql, params = []) {
  await client.query('begin');
  try {
    await client.query(`set local role authenticated`);
    await client.query(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: authUid, role: 'authenticated' })]);
    const r = await client.query(sql, params);
    await client.query('commit');
    return r.rows;
  } catch (err) {
    await client.query('rollback');
    throw err;
  }
}

await client.connect();
console.log('RLS BOUNDARY TESTS\n');

// ─── Seed two isolated patients plus staff ──────────────────────────────────
const authA = '11111111-1111-1111-1111-111111111111';
const authB = '22222222-2222-2222-2222-222222222222';
const authDoc = '33333333-3333-3333-3333-333333333333';
const authAsha = '44444444-4444-4444-4444-444444444444';
const authAdmin = '55555555-5555-5555-5555-555555555555';

await client.query(`delete from users where name like 'RLSTEST%'`);
await client.query(`delete from patients where name like 'RLSTEST%'`);
await client.query(`delete from facilities where name like 'RLSTEST%'`);
await client.query(`delete from auth.users where email like 'rlstest-%'`);

// users.auth_user_id has a real FK to auth.users, so the auth rows must exist.
const authIds = [authA, authB, authDoc, authAsha, authAdmin];
for (const id of authIds) {
  await client.query(
    `insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                             email_confirmed_at, created_at, updated_at)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             $2, 'x', now(), now(), now())`,
    [id, `rlstest-${id.slice(0, 8)}@example.test`]
  );
}

const [fac] = await q(
  `insert into facilities (name, type, district) values ('RLSTEST Facility','PHC','TestDistrict') returning id`
);

const mkUser = async (authUid, name, role, facilityId = null) =>
  (await q(
    `insert into users (auth_user_id, name, phone, role, district, facility_id)
     values ($1,$2,$3,$4,'TestDistrict',$5) returning id`,
    [authUid, name, `+9199${Math.floor(Math.random() * 90000000 + 10000000)}`, role, facilityId]
  ))[0];

const userA = await mkUser(authA, 'RLSTEST PatientA', 'PATIENT');
const userB = await mkUser(authB, 'RLSTEST PatientB', 'PATIENT');
const userDoc = await mkUser(authDoc, 'RLSTEST Doctor', 'DOCTOR', fac.id);
const userAsha = await mkUser(authAsha, 'RLSTEST Asha', 'ASHA');
const userAdmin = await mkUser(authAdmin, 'RLSTEST Admin', 'ADMIN');

const mkPatient = async (userId, name, ashaId = null) =>
  (await q(
    `insert into patients (user_id, name, district, assigned_asha_id)
     values ($1,$2,'OtherDistrict',$3) returning id`,
    [userId, name, ashaId]
  ))[0];

const patA = await mkPatient(userA.id, 'RLSTEST PatientA');
const patB = await mkPatient(userB.id, 'RLSTEST PatientB');
const patAsha = await mkPatient(null, 'RLSTEST AshaPatient', userAsha.id);

// Give each patient a private clinical record.
await client.query(
  `insert into consultations (patient_id, diagnosis) values ($1,'SECRET-A'), ($2,'SECRET-B')`,
  [patA.id, patB.id]
);

// ─── Patient isolation ──────────────────────────────────────────────────────
console.log('Patient isolation:');

const aSeesPatients = await asUser(authA, `select id, name from patients`);
check('Patient A sees only their own patient row',
  aSeesPatients.length === 1 && aSeesPatients[0].id === patA.id,
  `(saw ${aSeesPatients.length})`);

const aSeesB = await asUser(authA, `select id from patients where id = $1`, [patB.id]);
check('Patient A CANNOT read Patient B by id', aSeesB.length === 0, `(saw ${aSeesB.length})`);

const aSeesConsults = await asUser(authA, `select diagnosis from consultations`);
check('Patient A sees only their own consultation',
  aSeesConsults.length === 1 && aSeesConsults[0].diagnosis === 'SECRET-A',
  `(saw ${JSON.stringify(aSeesConsults.map(c => c.diagnosis))})`);

// ─── Writes are blocked too, not just reads ─────────────────────────────────
console.log('\nWrite protection:');

let blocked = false;
try {
  await asUser(authA, `update patients set name='HACKED' where id=$1`, [patB.id]);
  const [row] = await q(`select name from patients where id=$1`, [patB.id]);
  blocked = row.name !== 'HACKED';
} catch { blocked = true; }
check('Patient A CANNOT modify Patient B', blocked);

let roleBlocked = false;
try {
  await asUser(authA, `update users set role='ADMIN' where auth_user_id=$1`, [authA]);
  const [row] = await q(`select role from users where auth_user_id=$1`, [authA]);
  roleBlocked = row.role !== 'ADMIN';
} catch { roleBlocked = true; }
check('Patient A CANNOT escalate their own role to ADMIN', roleBlocked);

// ─── ASHA scoping ───────────────────────────────────────────────────────────
console.log('\nASHA scoping:');

const ashaSees = await asUser(authAsha, `select id from patients`);
check('ASHA sees only assigned patients',
  ashaSees.length === 1 && ashaSees[0].id === patAsha.id,
  `(saw ${ashaSees.length})`);

const ashaSeesA = await asUser(authAsha, `select id from patients where id=$1`, [patA.id]);
check('ASHA CANNOT read an unassigned patient', ashaSeesA.length === 0);

// ─── Doctor scoping ─────────────────────────────────────────────────────────
console.log('\nDoctor scoping:');

const docSees = await asUser(authDoc, `select id from patients where id=$1`, [patA.id]);
check('Doctor CANNOT read a patient outside their district and caseload',
  docSees.length === 0, `(saw ${docSees.length})`);

// ─── Admin ──────────────────────────────────────────────────────────────────
console.log('\nAdmin access:');

const adminSees = await asUser(authAdmin, `select id from patients where name like 'RLSTEST%'`);
check('Admin sees all test patients', adminSees.length === 3, `(saw ${adminSees.length})`);

const adminAudit = await asUser(authAdmin, `select count(*)::int c from audit_logs`);
check('Admin can read audit logs', Array.isArray(adminAudit));

const patientAudit = await asUser(authA, `select count(*)::int c from audit_logs`);
check('Patient sees no audit logs', Number(patientAudit[0].c) === 0, `(saw ${patientAudit[0].c})`);

// ─── Anonymous ──────────────────────────────────────────────────────────────
console.log('\nAnonymous access:');

await client.query('begin');
await client.query(`set local role anon`);
const anonPatients = await client.query(`select count(*)::int c from patients`);
await client.query('commit');
check('Anonymous sees zero patients', Number(anonPatients.rows[0].c) === 0,
  `(saw ${anonPatients.rows[0].c})`);

// ─── Cleanup ────────────────────────────────────────────────────────────────
await client.query(`delete from consultations where diagnosis in ('SECRET-A','SECRET-B')`);
await client.query(`delete from patients where name like 'RLSTEST%'`);
await client.query(`delete from users where name like 'RLSTEST%'`);
await client.query(`delete from facilities where name like 'RLSTEST%'`);
await client.query(`delete from auth.users where email like 'rlstest-%'`);

console.log(`\n${pass} passed, ${fail} failed`);
await client.end();
process.exit(fail > 0 ? 1 : 0);
