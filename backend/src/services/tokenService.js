import jwt from 'jsonwebtoken';
import { env, isProduction } from '../config/env.js';

const TTL_DAYS = Number.isFinite(env.SESSION_TTL_DAYS) && env.SESSION_TTL_DAYS > 0
  ? env.SESSION_TTL_DAYS
  : 7;

const JWT_EXPIRES_IN = `${TTL_DAYS}d`;
export const COOKIE_MAX_AGE_MS = TTL_DAYS * 24 * 60 * 60 * 1000;
export const COOKIE_NAME = 'token';

// Binding the token to this API stops a token minted for another service that
// happens to share the secret from being replayed here.
const ISSUER = 'arogyasetu-api';
const AUDIENCE = 'arogyasetu-app';

/**
 * The payload carries the user id and the assurance level of this session.
 *
 * Role is deliberately excluded so that a role change takes effect immediately
 * rather than persisting in old tokens. `aal` is the exception: it records what
 * actually happened at sign-in, which is a property of the session rather than
 * of the account, so it cannot be re-derived from the database later.
 */
export function signToken(user, { mfaSatisfied = false } = {}) {
  return jwt.sign(
    { sub: user.id, aal: mfaSatisfied ? 'aal2' : 'aal1' },
    env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, issuer: ISSUER, audience: AUDIENCE }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, {
    // Pinning the algorithm is what closes the `alg: none` / algorithm-confusion
    // class of attack, where a forged header talks the library out of verifying.
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function setSessionCookie(res, user, options = {}) {
  res.cookie(COOKIE_NAME, signToken(user, options), {
    httpOnly: true,
    secure: isProduction,
    // 'strict' would drop the cookie when a user arrives from an external link
    // (an SMS appointment reminder, for example) and silently log them out.
    // 'lax' keeps that working; CSRF is covered separately by csrfProtection.
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  // The attributes must match those used when setting it, or the browser keeps
  // the original cookie and the user is never actually logged out.
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
}
