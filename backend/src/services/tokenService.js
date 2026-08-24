import jwt from 'jsonwebtoken';
import { env, isProduction } from '../config/env.js';

const JWT_EXPIRES_IN = '7d';
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const COOKIE_NAME = 'token';

/**
 * The payload carries only the user id. Role is deliberately excluded so that
 * a role change takes effect immediately rather than persisting in old tokens.
 */
export function signToken(user) {
  return jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

export function setSessionCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}
