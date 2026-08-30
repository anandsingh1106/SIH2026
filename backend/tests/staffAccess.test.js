import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import {
  resetTestDb, createUser, createFacility, authCookie, passwordOnlyCookie, request,
} from './helpers.js';
import { getDb } from '../src/db/connection.js';
import {
  createRequest, approveRequest, rejectRequest, withdrawRequest, setUserRole, listRequests, myRequest,
} from '../src/services/staffAccessService.js';
import { roleFromApi } from '../src/utils/mappers.js';

const app = createApp();

beforeEach(async () => {
  await resetTestDb();
});

/** Mirrors what authService does with a self-registration payload. */
function selfRegisteredRole(claimedApiRole) {
  const claimed = roleFromApi(claimedApiRole);
  // Public signup pins the row to PATIENT regardless of what was claimed.
  return { claimed, granted: 'PATIENT' };
}

describe('privilege escalation via self-registration', () => {
  it.each(['admin', 'doctor', 'specialist', 'asha'])(
    'does not grant %s just because signup asked for it',
    (claimedRole) => {
      const { granted } = selfRegisteredRole(claimedRole);
      // Before this control existed, the claimed role was written straight to
      // the users row, so anyone could self-register as ADMIN.
      expect(granted).toBe('PATIENT');
    }
  );

  it('files a pending request rather than silently ignoring the claim', () => {
    const applicant = createUser({ role: 'PATIENT' });
    createRequest(applicant, { requestedRole: 'DOCTOR', registrationNumber: 'HPR-123' });

    const mine = myRequest(applicant);
    expect(mine.status).toBe('PENDING');
    expect(mine.requestedRole).toBe('DOCTOR');
  });

  it('leaves the applicant as a patient while the request is pending', () => {
    const applicant = createUser({ role: 'PATIENT' });
    createRequest(applicant, { requestedRole: 'ADMIN' });

    const row = getDb().prepare('SELECT role FROM users WHERE id = ?').get(applicant.id);
    expect(row.role).toBe('PATIENT');
  });
});

describe('request lifecycle', () => {
  it('rejects a role that is not requestable', () => {
    const applicant = createUser({ role: 'PATIENT' });
    expect(() => createRequest(applicant, { requestedRole: 'PATIENT' })).toThrow();
    expect(() => createRequest(applicant, { requestedRole: 'SUPERUSER' })).toThrow();
  });

  it('refuses a second pending request', () => {
    const applicant = createUser({ role: 'PATIENT' });
    createRequest(applicant, { requestedRole: 'ASHA' });

    // Otherwise a repeated submit floods the review queue.
    expect(() => createRequest(applicant, { requestedRole: 'DOCTOR' })).toThrow(/awaiting review/i);
  });

  it('refuses a request for a role the user already holds', () => {
    const doctor = createUser({ role: 'DOCTOR' });
    expect(() => createRequest(doctor, { requestedRole: 'DOCTOR' })).toThrow(/already have/i);
  });

  it('allows a fresh request after a rejection', () => {
    const admin = createUser({ role: 'ADMIN' });
    const applicant = createUser({ role: 'PATIENT' });

    const first = createRequest(applicant, { requestedRole: 'DOCTOR' });
    rejectRequest(admin, first.id, { reviewNote: 'Registration number not found.' });

    expect(() => createRequest(applicant, { requestedRole: 'DOCTOR' })).not.toThrow();
  });

  it('lets an applicant withdraw their own request', () => {
    const applicant = createUser({ role: 'PATIENT' });
    const req = createRequest(applicant, { requestedRole: 'ASHA' });

    withdrawRequest(applicant, req.id);
    expect(myRequest(applicant).status).toBe('WITHDRAWN');
  });

  it("does not let one user withdraw another's request", () => {
    const applicant = createUser({ role: 'PATIENT' });
    const stranger = createUser({ role: 'PATIENT' });
    const req = createRequest(applicant, { requestedRole: 'ASHA' });

    // 404, not 403, so request ids cannot be probed.
    expect(() => withdrawRequest(stranger, req.id)).toThrow(/not found/i);
  });
});

describe('approval', () => {
  it('grants the requested role', () => {
    const admin = createUser({ role: 'ADMIN' });
    const applicant = createUser({ role: 'PATIENT' });
    const req = createRequest(applicant, { requestedRole: 'DOCTOR' });

    const result = approveRequest(admin, req.id);

    expect(result.grantedRole).toBe('DOCTOR');
    expect(getDb().prepare('SELECT role FROM users WHERE id = ?').get(applicant.id).role).toBe('DOCTOR');
  });

  it('tells the user they must sign in again', () => {
    const admin = createUser({ role: 'ADMIN' });
    const applicant = createUser({ role: 'PATIENT' });
    const req = createRequest(applicant, { requestedRole: 'ASHA' });

    // Their session is aal1 and the new role needs 2FA, so it cannot be used
    // until they re-authenticate.
    expect(approveRequest(admin, req.id).requiresReauth).toBe(true);
  });

  it('refuses self-approval', () => {
    const admin = createUser({ role: 'ADMIN' });
    const req = createRequest(admin, { requestedRole: 'SPECIALIST' });

    // Otherwise the whole review control is decorative.
    expect(() => approveRequest(admin, req.id)).toThrow(/your own/i);
  });

  it('refuses to approve a request twice', () => {
    const admin = createUser({ role: 'ADMIN' });
    const applicant = createUser({ role: 'PATIENT' });
    const req = createRequest(applicant, { requestedRole: 'DOCTOR' });

    approveRequest(admin, req.id);
    expect(() => approveRequest(admin, req.id)).toThrow(/already/i);
  });

  it('records who granted the role', () => {
    const admin = createUser({ role: 'ADMIN', name: 'Reviewing Admin' });
    const applicant = createUser({ role: 'PATIENT' });
    const req = createRequest(applicant, { requestedRole: 'DOCTOR' });

    approveRequest(admin, req.id);

    const entry = getDb()
      .prepare("SELECT * FROM audit_logs WHERE action = 'STAFF_ACCESS_APPROVED' AND entity_id = ?")
      .get(applicant.id);

    expect(entry).toBeTruthy();
    expect(entry.actor_id).toBe(admin.id);
    expect(JSON.parse(entry.new_values).role).toBe('DOCTOR');
  });

  it('attaches the granted facility', () => {
    const facility = createFacility({ name: 'PHC Test', district: 'Pune' });
    const admin = createUser({ role: 'ADMIN' });
    const applicant = createUser({ role: 'PATIENT' });
    const req = createRequest(applicant, { requestedRole: 'DOCTOR' });

    approveRequest(admin, req.id, { facilityId: facility.id });

    const row = getDb().prepare('SELECT facility_id FROM users WHERE id = ?').get(applicant.id);
    expect(row.facility_id).toBe(facility.id);
  });
});

describe('rejection', () => {
  it('leaves the applicant a patient and records the reason', () => {
    const admin = createUser({ role: 'ADMIN' });
    const applicant = createUser({ role: 'PATIENT' });
    const req = createRequest(applicant, { requestedRole: 'ADMIN' });

    rejectRequest(admin, req.id, { reviewNote: 'Could not verify employee ID.' });

    expect(getDb().prepare('SELECT role FROM users WHERE id = ?').get(applicant.id).role).toBe('PATIENT');
    expect(myRequest(applicant).reviewNote).toBe('Could not verify employee ID.');
  });
});

describe('direct role changes', () => {
  it('lets an admin revoke a role', () => {
    const admin = createUser({ role: 'ADMIN' });
    const doctor = createUser({ role: 'DOCTOR' });

    setUserRole(admin, doctor.id, 'PATIENT');
    expect(getDb().prepare('SELECT role FROM users WHERE id = ?').get(doctor.id).role).toBe('PATIENT');
  });

  it('stops an admin changing their own role', () => {
    const admin = createUser({ role: 'ADMIN' });
    // Otherwise a deployment can be stranded with no administrator.
    expect(() => setUserRole(admin, admin.id, 'PATIENT')).toThrow(/your own/i);
  });

  it('rejects an unknown role', () => {
    const admin = createUser({ role: 'ADMIN' });
    const user = createUser({ role: 'PATIENT' });
    expect(() => setUserRole(admin, user.id, 'ROOT')).toThrow(/unknown role/i);
  });
});

describe('endpoint authorization', () => {
  it('lets a patient file a request', async () => {
    const applicant = createUser({ role: 'PATIENT' });

    const res = await request(app)
      .post('/api/staff-access/requests')
      .set('Cookie', authCookie(applicant))
      .send({ requestedRole: 'ASHA', registrationNumber: 'ASHA-99' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
  });

  it('keeps a non-admin out of the review queue', async () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const res = await request(app)
      .get('/api/staff-access/requests')
      .set('Cookie', authCookie(doctor));

    expect(res.status).toBe(403);
  });

  it('keeps a non-admin from approving', async () => {
    const admin = createUser({ role: 'ADMIN' });
    const applicant = createUser({ role: 'PATIENT' });
    const attacker = createUser({ role: 'DOCTOR' });
    const req = createRequest(applicant, { requestedRole: 'ADMIN' });

    const res = await request(app)
      .post(`/api/staff-access/requests/${req.id}/approve`)
      .set('Cookie', authCookie(attacker));

    expect(res.status).toBe(403);
    expect(getDb().prepare('SELECT role FROM users WHERE id = ?').get(applicant.id).role).toBe('PATIENT');
    expect(admin).toBeTruthy();
  });

  it('refuses approval from an admin who has not passed 2FA', async () => {
    const admin = createUser({ role: 'ADMIN' });
    const applicant = createUser({ role: 'PATIENT' });
    const req = createRequest(applicant, { requestedRole: 'DOCTOR' });

    const res = await request(app)
      .post(`/api/staff-access/requests/${req.id}/approve`)
      .set('Cookie', passwordOnlyCookie(admin));

    // A stolen admin password alone must not be able to grant roles.
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MFA_REQUIRED');
  });

  it('lets a verified admin approve', async () => {
    const admin = createUser({ role: 'ADMIN' });
    const applicant = createUser({ role: 'PATIENT' });
    const req = createRequest(applicant, { requestedRole: 'DOCTOR' });

    const res = await request(app)
      .post(`/api/staff-access/requests/${req.id}/approve`)
      .set('Cookie', authCookie(admin))
      .send({ reviewNote: 'HPR ID verified.' });

    expect(res.status).toBe(200);
    expect(res.body.data.grantedRole).toBe('DOCTOR');
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/staff-access/requests').send({ requestedRole: 'ADMIN' });
    expect(res.status).toBe(401);
  });
});

describe('review queue', () => {
  it('lists pending requests with the credential to check', () => {
    const applicant = createUser({ role: 'PATIENT', name: 'Dr Applicant' });
    createRequest(applicant, { requestedRole: 'DOCTOR', registrationNumber: 'HPR-4242' });

    const { items, total } = listRequests({ status: 'PENDING' });

    expect(total).toBe(1);
    expect(items[0].registrationNumber).toBe('HPR-4242');
    expect(items[0].credentialHint).toMatch(/HPR/);
    expect(items[0].applicant.name).toBe('Dr Applicant');
  });

  it('excludes decided requests from the pending queue', () => {
    const admin = createUser({ role: 'ADMIN' });
    const applicant = createUser({ role: 'PATIENT' });
    const req = createRequest(applicant, { requestedRole: 'ASHA' });

    approveRequest(admin, req.id);
    expect(listRequests({ status: 'PENDING' }).total).toBe(0);
    expect(listRequests({ status: 'APPROVED' }).total).toBe(1);
  });
});
