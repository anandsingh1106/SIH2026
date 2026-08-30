import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { resetTestDb, createUser, authCookie } from './helpers.js';
import { signToken, verifyToken } from '../src/services/tokenService.js';
import { env } from '../src/config/env.js';
import { getDb } from '../src/db/connection.js';
import { csrfProtection, issueCsrfToken, CSRF_COOKIE, CSRF_HEADER } from '../src/middleware/csrf.js';
import {
  checkLockout, recordFailure, recordSuccess, resetAttempts,
} from '../src/services/loginAttemptService.js';

const app = createApp();

beforeEach(async () => {
  await resetTestDb();
  resetAttempts();
});

/** Drives csrfProtection directly, since supertest has no browser cookie jar. */
function runCsrf({ method = 'POST', cookies = {}, header, path = '/api/patients' }) {
  return new Promise((resolve) => {
    const req = {
      method,
      cookies,
      originalUrl: path,
      get: (name) => (name.toLowerCase() === CSRF_HEADER ? header : undefined),
    };
    csrfProtection(req, {}, (err) => resolve(err));
  });
}

describe('security response headers', () => {
  it('does not advertise the server framework', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sets a restrictive content security policy', async () => {
    const res = await request(app).get('/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('refuses to be framed and blocks MIME sniffing', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('marks API responses no-store so patient data is not cached', async () => {
    const user = createUser({ role: 'DOCTOR' });
    const res = await request(app).get('/api/auth/me').set('Cookie', authCookie(user));
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('no-store');
  });
});

describe('JWT hardening', () => {
  it('rejects a token using the "none" algorithm', async () => {
    const user = createUser();
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: user.id })).toString('base64url');

    const res = await request(app).get('/api/auth/me').set('Cookie', `token=${header}.${body}.`);
    expect(res.status).toBe(401);
  });

  it('rejects a correctly signed token issued for another audience', async () => {
    const user = createUser();
    const foreign = jwt.sign({ sub: user.id }, env.JWT_SECRET, {
      expiresIn: '7d',
      issuer: 'someone-else',
      audience: 'another-app',
    });

    const res = await request(app).get('/api/auth/me').set('Cookie', `token=${foreign}`);
    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const user = createUser();
    const expired = jwt.sign({ sub: user.id }, env.JWT_SECRET, {
      expiresIn: '-1s',
      issuer: 'arogyasetu-api',
      audience: 'arogyasetu-app',
    });

    const res = await request(app).get('/api/auth/me').set('Cookie', `token=${expired}`);
    expect(res.status).toBe(401);
  });

  it('accepts a token this service issued', () => {
    const user = createUser();
    const payload = verifyToken(signToken(user));
    expect(payload.sub).toBe(user.id);
    expect(payload.aud).toBe('arogyasetu-app');
  });

  it('omits the role from the token so it cannot be forged', () => {
    const user = createUser({ role: 'PATIENT' });
    expect(verifyToken(signToken(user)).role).toBeUndefined();
  });
});

describe('CSRF protection', () => {
  it('issues a readable token cookie the frontend can echo back', () => {
    const captured = {};
    const res = { cookie: (name, value, opts) => Object.assign(captured, { name, value, opts }) };
    const token = issueCsrfToken(res);

    expect(captured.name).toBe(CSRF_COOKIE);
    expect(captured.value).toBe(token);
    // Must be readable by JS, or the client cannot build the header.
    expect(captured.opts.httpOnly).toBe(false);
    expect(token).toHaveLength(64);
  });

  it('issues an unpredictable token each time', () => {
    const noop = { cookie: () => {} };
    expect(issueCsrfToken(noop)).not.toBe(issueCsrfToken(noop));
  });

  it('allows safe methods through untouched', async () => {
    expect(await runCsrf({ method: 'GET', cookies: { token: 'abc' } })).toBeUndefined();
  });

  it('allows a write when no session cookie is present', async () => {
    expect(await runCsrf({ method: 'POST', cookies: {} })).toBeUndefined();
  });

  it('rejects a cookie-authenticated write with no CSRF header', async () => {
    const err = await runCsrf({ cookies: { token: 'abc', [CSRF_COOKIE]: 'secret123' } });
    expect(err?.status).toBe(403);
  });

  it('rejects a write whose header does not match the cookie', async () => {
    const err = await runCsrf({
      cookies: { token: 'abc', [CSRF_COOKIE]: 'secret123' },
      header: 'wrong-value',
    });
    expect(err?.status).toBe(403);
  });

  it('rejects a write carrying a header but no CSRF cookie', async () => {
    const err = await runCsrf({ cookies: { token: 'abc' }, header: 'secret123' });
    expect(err?.status).toBe(403);
  });

  it('accepts a write where the header matches the cookie', async () => {
    const err = await runCsrf({
      cookies: { token: 'abc', [CSRF_COOKIE]: 'secret123' },
      header: 'secret123',
    });
    expect(err).toBeUndefined();
  });

  it('lets sign-in through when a stale session cookie has no CSRF cookie', async () => {
    // A browser holding a session cookie from before CSRF existed would
    // otherwise be locked out of the one endpoint that issues a token.
    const err = await runCsrf({
      cookies: { token: 'stale-from-an-earlier-deployment' },
      path: '/api/auth/session',
    });
    expect(err).toBeUndefined();
  });

  it('lets sign-out through on a stale session', async () => {
    const err = await runCsrf({ cookies: { token: 'stale' }, path: '/api/auth/logout' });
    expect(err).toBeUndefined();
  });

  it('still guards every other write on that same stale session', async () => {
    // The exemption must be limited to the session endpoints themselves.
    const err = await runCsrf({ cookies: { token: 'stale' }, path: '/api/appointments' });
    expect(err?.status).toBe(403);
  });

  it('does not exempt a path that merely looks like the session endpoint', async () => {
    const err = await runCsrf({
      cookies: { token: 'stale' },
      path: '/api/auth/session/evil',
    });
    expect(err?.status).toBe(403);
  });

  it('returns a CSRF token to the client on session restore', async () => {
    const user = createUser({ role: 'ASHA' });
    const res = await request(app).get('/api/auth/me').set('Cookie', authCookie(user));
    expect(res.status).toBe(200);
    expect(res.body.data.csrfToken).toBeTruthy();
  });
});

describe('login lockout', () => {
  it('locks only after the fifth failure', () => {
    const key = 'ip:203.0.113.9';
    for (let i = 0; i < 4; i++) recordFailure(key);
    expect(checkLockout(key)).toBe(0);

    recordFailure(key);
    expect(checkLockout(key)).toBeGreaterThan(0);
  });

  it('tracks each source independently', () => {
    for (let i = 0; i < 5; i++) recordFailure('ip:198.51.100.1');
    expect(checkLockout('ip:198.51.100.1')).toBeGreaterThan(0);
    expect(checkLockout('ip:198.51.100.2')).toBe(0);
  });

  it('clears the counter after a successful sign-in', () => {
    const key = 'ip:203.0.113.10';
    for (let i = 0; i < 4; i++) recordFailure(key);
    recordSuccess(key);
    for (let i = 0; i < 4; i++) recordFailure(key);
    expect(checkLockout(key)).toBe(0);
  });
});

describe('CORS policy', () => {
  it('does not reflect an arbitrary origin back to the caller', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('authorization boundaries', () => {
  it('keeps a non-admin out of the audit log', async () => {
    const doctor = createUser({ role: 'DOCTOR' });
    const res = await request(app).get('/api/audit-logs').set('Cookie', authCookie(doctor));
    expect(res.status).toBe(403);
  });

  it('keeps a non-admin out of admin analytics', async () => {
    const asha = createUser({ role: 'ASHA' });
    const res = await request(app).get('/api/analytics/admin').set('Cookie', authCookie(asha));
    expect(res.status).toBe(403);
  });

  it('rejects a session belonging to a suspended account', async () => {
    const user = createUser({ role: 'DOCTOR', status: 'SUSPENDED' });
    const res = await request(app).get('/api/auth/me').set('Cookie', authCookie(user));
    expect(res.status).toBe(403);
  });

  it('rejects a validly signed token whose account no longer exists', async () => {
    const user = createUser();
    const cookie = authCookie(user);
    getDb().prepare('DELETE FROM users WHERE id = ?').run(user.id);

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});

describe('public endpoints', () => {
  it('exposes only aggregate counts, never patient records', async () => {
    const res = await request(app).get('/api/public/stats');
    expect(res.status).toBe(200);
    for (const value of Object.values(res.body.data)) {
      expect(typeof value).toBe('number');
    }
  });

  it('does not accept a patient listing without authentication', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });
});
