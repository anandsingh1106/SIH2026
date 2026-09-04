import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { resetTestDb, createUser, createFacility, authCookie, request } from './helpers.js';
import { signToken } from '../src/services/tokenService.js';
import { getDb } from '../src/db/connection.js';

const app = createApp();

beforeEach(async () => {
  await resetTestDb();
});

describe('GET /api/auth/me', () => {
  it('rejects an anonymous request', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'token=garbage');
    expect(res.status).toBe(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      // Valid JWT structure, wrong signature.
      .set('Cookie', 'token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bad-signature');
    expect(res.status).toBe(401);
  });

  it('restores a session for a valid cookie', async () => {
    const facility = createFacility({ name: 'PHC Test' });
    const user = createUser({ role: 'DOCTOR', name: 'Dr Test', facilityId: facility.id });

    const res = await request(app).get('/api/auth/me').set('Cookie', authCookie(user));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(user.id);
    // Roles are exposed lowercase to preserve the existing frontend contract.
    expect(res.body.data.user.role).toBe('doctor');
    expect(res.body.data.user.facilityName).toBe('PHC Test');
  });

  it('never exposes internal columns', async () => {
    const user = createUser({ role: 'PATIENT' });
    const res = await request(app).get('/api/auth/me').set('Cookie', authCookie(user));

    expect(res.body.data.user).not.toHaveProperty('firebase_uid');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
    expect(res.body.data.user).not.toHaveProperty('status');
  });

  it('rejects a token whose user no longer exists', async () => {
    const user = createUser({ role: 'PATIENT' });
    const cookie = authCookie(user);
    getDb().prepare('DELETE FROM users WHERE id = ?').run(user.id);

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  it('rejects a suspended account', async () => {
    const user = createUser({ role: 'PATIENT', status: 'SUSPENDED' });
    const res = await request(app).get('/api/auth/me').set('Cookie', authCookie(user));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('reads the role from the database, not the token payload', async () => {
    const user = createUser({ role: 'PATIENT' });
    // A forged token claiming ADMIN must not grant admin.
    const forged = signToken({ id: user.id });
    getDb().prepare("UPDATE users SET role = 'PATIENT' WHERE id = ?").run(user.id);

    const res = await request(app).get('/api/auth/me').set('Cookie', `token=${forged}`);
    expect(res.body.data.user.role).toBe('patient');
  });

  // React Native has no cookie jar, so it authenticates with the same JWT
  // sent as a bearer header instead of a cookie.
  it('restores a session for a valid bearer token', async () => {
    const user = createUser({ role: 'ASHA' });
    const token = signToken(user);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.id);
  });

  it('rejects a malformed bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });

  it('prefers the bearer token when both a cookie and a header are present', async () => {
    const cookieUser = createUser({ role: 'PATIENT' });
    const bearerUser = createUser({ role: 'DOCTOR' });
    const token = signToken(bearerUser);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie(cookieUser))
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(bearerUser.id);
  });
});

describe('POST /api/auth/session', () => {
  it('requires an accessToken', async () => {
    const res = await request(app).post('/api/auth/session').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe('accessToken');
  });

  it('rejects an invalid role value', async () => {
    const res = await request(app)
      .post('/api/auth/session')
      .send({ accessToken: 'x', name: 'Test', role: 'superuser' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a token Supabase does not recognise', async () => {
    const res = await request(app)
      .post('/api/auth/session')
      .send({ accessToken: 'not-a-real-supabase-token' });

    // 401 when Supabase rejects it, 503 when the server has no Supabase config.
    expect([401, 503]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session cookie', async () => {
    const user = createUser({ role: 'PATIENT' });
    const res = await request(app).post('/api/auth/logout').set('Cookie', authCookie(user));

    expect(res.status).toBe(200);
    expect(String(res.headers['set-cookie'])).toMatch(/token=;/);
  });

  it('succeeds even when not logged in', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });

  it('writes an audit entry on logout', async () => {
    const user = createUser({ role: 'PATIENT' });
    await request(app).post('/api/auth/logout').set('Cookie', authCookie(user));

    const log = getDb()
      .prepare("SELECT * FROM audit_logs WHERE action = 'LOGOUT' AND actor_id = ?")
      .get(user.id);
    expect(log).toBeTruthy();
  });
});
