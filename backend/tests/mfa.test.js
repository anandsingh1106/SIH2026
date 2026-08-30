import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import {
  resetTestDb, createUser, createPatient, authCookie, passwordOnlyCookie, request,
} from './helpers.js';
import { getDb } from '../src/db/connection.js';
import { verifyToken } from '../src/services/tokenService.js';
import {
  MFA_REQUIRED_ROLES,
  isMfaRequiredForRole,
  mustEnrolMfa,
  generateRecoveryCodes,
  consumeRecoveryCode,
  countUnusedRecoveryCodes,
} from '../src/services/mfaService.js';

const app = createApp();

beforeEach(async () => {
  await resetTestDb();
});

describe('policy: which roles need 2FA', () => {
  it.each(MFA_REQUIRED_ROLES)('requires it for %s', (role) => {
    expect(isMfaRequiredForRole(role)).toBe(true);
  });

  it('does not require it for a patient', () => {
    // Patients reach only their own record and may have no smartphone; see
    // the reasoning in mfaService.
    expect(isMfaRequiredForRole('PATIENT')).toBe(false);
  });

  it('flags an unenrolled staff account as needing enrolment', () => {
    const doctor = createUser({ role: 'DOCTOR', mfaEnrolled: false });
    expect(mustEnrolMfa(doctor)).toBe(true);
  });

  it('does not flag an enrolled staff account', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    expect(mustEnrolMfa(doctor)).toBe(false);
  });

  it('never flags a patient, enrolled or not', () => {
    expect(mustEnrolMfa(createUser({ role: 'PATIENT' }))).toBe(false);
  });
});

describe('enforcement: unenrolled staff cannot reach patient data', () => {
  it('blocks a doctor who has never enrolled', async () => {
    const doctor = createUser({ role: 'DOCTOR', mfaEnrolled: false });

    const res = await request(app).get('/api/patients').set('Cookie', authCookie(doctor));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MFA_ENROLMENT_REQUIRED');
  });

  it.each(['ASHA', 'DOCTOR', 'SPECIALIST', 'ADMIN'])(
    'blocks an unenrolled %s',
    async (role) => {
      const user = createUser({ role, mfaEnrolled: false });
      const res = await request(app).get('/api/patients').set('Cookie', authCookie(user));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MFA_ENROLMENT_REQUIRED');
    }
  );

  it('lets an unenrolled patient through, since 2FA is optional for them', async () => {
    const patientUser = createUser({ role: 'PATIENT' });
    createPatient({ userId: patientUser.id });

    const res = await request(app).get('/api/patients').set('Cookie', authCookie(patientUser));
    expect(res.status).toBe(200);
  });
});

describe('enforcement: an enrolled user must actually present the factor', () => {
  it('blocks a password-only session for an enrolled doctor', async () => {
    const doctor = createUser({ role: 'DOCTOR' });

    const res = await request(app)
      .get('/api/patients')
      .set('Cookie', passwordOnlyCookie(doctor));

    // Distinct from MFA_ENROLMENT_REQUIRED: the factor exists, it just was not
    // used, so the client should prompt for a code rather than restart setup.
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MFA_REQUIRED');
  });

  it('allows the same doctor once the factor is satisfied', async () => {
    const doctor = createUser({ role: 'DOCTOR' });

    const res = await request(app).get('/api/patients').set('Cookie', authCookie(doctor));
    expect(res.status).toBe(200);
  });

  it('blocks an enrolled patient who signed in with a password only', async () => {
    // Opting in must be meaningful: having enrolled, the factor is then required.
    const patientUser = createUser({ role: 'PATIENT', mfaEnrolled: true });
    createPatient({ userId: patientUser.id });

    const res = await request(app)
      .get('/api/patients')
      .set('Cookie', passwordOnlyCookie(patientUser));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MFA_REQUIRED');
  });

  it('blocks writes as well as reads', async () => {
    const doctor = createUser({ role: 'DOCTOR', mfaEnrolled: false });

    const res = await request(app)
      .post('/api/patients')
      .set('Cookie', authCookie(doctor))
      .send({ name: 'Someone', phone: '+919900000123', district: 'Pune' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MFA_ENROLMENT_REQUIRED');
  });

  it('blocks the audit log from an unenrolled admin', async () => {
    const admin = createUser({ role: 'ADMIN', mfaEnrolled: false });
    const res = await request(app).get('/api/audit-logs').set('Cookie', authCookie(admin));
    expect(res.status).toBe(403);
  });
});

describe('routes reachable before the second factor is satisfied', () => {
  it('allows /api/auth/me so the app can learn what is outstanding', async () => {
    const doctor = createUser({ role: 'DOCTOR', mfaEnrolled: false });

    const res = await request(app).get('/api/auth/me').set('Cookie', authCookie(doctor));

    expect(res.status).toBe(200);
    expect(res.body.data.mfa.action).toBe('enrol');
    expect(res.body.data.mfa.required).toBe(true);
  });

  it('reports "verify" for an enrolled user on a password-only session', async () => {
    const doctor = createUser({ role: 'DOCTOR' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', passwordOnlyCookie(doctor));

    expect(res.status).toBe(200);
    expect(res.body.data.mfa.action).toBe('verify');
  });

  it('reports "none" once everything is satisfied', async () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const res = await request(app).get('/api/auth/me').set('Cookie', authCookie(doctor));
    expect(res.body.data.mfa.action).toBe('none');
  });

  it('leaves public endpoints open', async () => {
    const res = await request(app).get('/api/public/stats');
    expect(res.status).toBe(200);
  });

  it('still returns 401 for an anonymous request, not a 2FA error', async () => {
    // The gate must not turn "not signed in" into a confusing 403.
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });
});

describe('session assurance level', () => {
  it('records aal1 for a password-only session', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const token = passwordOnlyCookie(doctor).match(/token=([^;]+)/)[1];
    expect(verifyToken(token).aal).toBe('aal1');
  });

  it('records aal2 once the factor is satisfied', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const token = authCookie(doctor).match(/token=([^;]+)/)[1];
    expect(verifyToken(token).aal).toBe('aal2');
  });
});

describe('recovery codes', () => {
  it('issues ten single-use codes', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const codes = generateRecoveryCodes(doctor);

    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(countUnusedRecoveryCodes(doctor.id)).toBe(10);
  });

  it('stores only hashes, never the code itself', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const [code] = generateRecoveryCodes(doctor);

    const rows = getDb()
      .prepare('SELECT code_hash FROM mfa_recovery_codes WHERE user_id = ?')
      .all(doctor.id);

    const normalised = code.replace(/-/g, '');
    for (const row of rows) {
      expect(row.code_hash).not.toBe(code);
      expect(row.code_hash).not.toBe(normalised);
      expect(row.code_hash).toHaveLength(64);
    }
  });

  it('accepts a valid code exactly once', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const [code] = generateRecoveryCodes(doctor);

    expect(consumeRecoveryCode(doctor, code)).toBe(true);
    // Replaying a spent code must fail, or a stolen printout stays useful.
    expect(consumeRecoveryCode(doctor, code)).toBe(false);
    expect(countUnusedRecoveryCodes(doctor.id)).toBe(9);
  });

  it('rejects a code belonging to a different user', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const other = createUser({ role: 'ASHA' });
    const [code] = generateRecoveryCodes(doctor);

    expect(consumeRecoveryCode(other, code)).toBe(false);
    expect(countUnusedRecoveryCodes(doctor.id)).toBe(10);
  });

  it('rejects nonsense without throwing', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    generateRecoveryCodes(doctor);

    for (const bad of ['', '   ', 'not-a-code', '0'.repeat(64)]) {
      expect(consumeRecoveryCode(doctor, bad)).toBe(false);
    }
  });

  it('ignores case and separators the user may retype', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const [code] = generateRecoveryCodes(doctor);

    const messy = ` ${code.toLowerCase().replace('-', '')} `;
    expect(consumeRecoveryCode(doctor, messy)).toBe(true);
  });

  it('invalidates the previous set when regenerated', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const [oldCode] = generateRecoveryCodes(doctor);

    generateRecoveryCodes(doctor);

    // An old printout must stop working once replaced.
    expect(consumeRecoveryCode(doctor, oldCode)).toBe(false);
    expect(countUnusedRecoveryCodes(doctor.id)).toBe(10);
  });

  it('records use in the audit log', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const [code] = generateRecoveryCodes(doctor);
    consumeRecoveryCode(doctor, code);

    const entry = getDb()
      .prepare(
        "SELECT * FROM audit_logs WHERE actor_id = ? AND action = 'MFA_RECOVERY_CODE_USED'"
      )
      .get(doctor.id);

    expect(entry).toBeTruthy();
  });

  it('records a rejected attempt, so brute force is visible', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    generateRecoveryCodes(doctor);
    consumeRecoveryCode(doctor, 'WRONG-CODE1');

    const entry = getDb()
      .prepare(
        "SELECT * FROM audit_logs WHERE actor_id = ? AND action = 'MFA_RECOVERY_CODE_REJECTED'"
      )
      .get(doctor.id);

    expect(entry).toBeTruthy();
  });
});

describe('MFA endpoints', () => {
  it('reports status for a user with no Supabase link', async () => {
    // No auth_user_id means there is nothing to reconcile against, which is a
    // real answer rather than a failure, so the mirror stands.
    const doctor = createUser({ role: 'DOCTOR' });
    generateRecoveryCodes(doctor);

    const res = await request(app)
      .get('/api/auth/mfa/status')
      .set('Cookie', authCookie(doctor));

    expect(res.status).toBe(200);
    expect(res.body.data.required).toBe(true);
    expect(res.body.data.recoveryCodesRemaining).toBe(10);
  });

  it('surfaces a lookup failure instead of guessing at enrolment', async () => {
    // With a Supabase link present but the client unconfigured, the lookup
    // fails. Reporting "not enrolled" on a guess would wave a staff account
    // through re-enrolment, so the error must reach the caller.
    const doctor = createUser({ role: 'DOCTOR' });
    getDb()
      .prepare('UPDATE users SET auth_user_id = ? WHERE id = ?')
      .run('11111111-2222-3333-4444-555555555555', doctor.id);

    const res = await request(app)
      .get('/api/auth/mfa/status')
      .set('Cookie', authCookie(doctor));

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('MFA_LOOKUP_FAILED');
  });

  it('rejects an invalid recovery code with a vague message', async () => {
    const doctor = createUser({ role: 'DOCTOR' });
    generateRecoveryCodes(doctor);

    const res = await request(app)
      .post('/api/auth/mfa/recovery')
      .set('Cookie', passwordOnlyCookie(doctor))
      .send({ code: 'BADCODE123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MFA_RECOVERY_INVALID');
    // Must not reveal whether the code was wrong or merely already spent.
    expect(res.body.error.message).not.toMatch(/used|spent|expired/i);
  });

  it('upgrades a password-only session when a recovery code is accepted', async () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const [code] = generateRecoveryCodes(doctor);

    const res = await request(app)
      .post('/api/auth/mfa/recovery')
      .set('Cookie', passwordOnlyCookie(doctor))
      .send({ code });

    expect(res.status).toBe(200);
    expect(res.body.data.remaining).toBe(9);

    // The re-issued cookie must now assert aal2, or the user stays locked out.
    const setCookie = res.headers['set-cookie'].join(';');
    const token = setCookie.match(/token=([^;]+)/)[1];
    expect(verifyToken(token).aal).toBe('aal2');
  });

  it('refuses to regenerate codes from a password-only session', async () => {
    const doctor = createUser({ role: 'DOCTOR' });

    const res = await request(app)
      .post('/api/auth/mfa/recovery-codes')
      .set('Cookie', passwordOnlyCookie(doctor));

    // Otherwise a stolen password alone would mint fresh bypass credentials.
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MFA_REQUIRED');
  });

  it('regenerates codes for a fully verified session', async () => {
    const doctor = createUser({ role: 'DOCTOR' });

    const res = await request(app)
      .post('/api/auth/mfa/recovery-codes')
      .set('Cookie', authCookie(doctor));

    expect(res.status).toBe(201);
    expect(res.body.data.recoveryCodes).toHaveLength(10);
  });

  it('keeps a non-admin away from the reset endpoint', async () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const victim = createUser({ role: 'ASHA' });

    const res = await request(app)
      .post(`/api/auth/mfa/reset/${victim.id}`)
      .set('Cookie', authCookie(doctor));

    expect(res.status).toBe(403);
  });

  it('refuses an admin reset from a password-only session', async () => {
    const admin = createUser({ role: 'ADMIN' });
    const victim = createUser({ role: 'ASHA' });

    const res = await request(app)
      .post(`/api/auth/mfa/reset/${victim.id}`)
      .set('Cookie', passwordOnlyCookie(admin));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MFA_REQUIRED');
  });

  it('requires authentication for every MFA route', async () => {
    for (const path of ['/api/auth/mfa/status', '/api/auth/mfa/recovery-codes']) {
      const res = await request(app).get(path);
      expect([401, 404]).toContain(res.status);
    }
  });
});
