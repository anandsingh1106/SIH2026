import rateLimit from 'express-rate-limit';
import { isTest } from './env.js';
import { sendError } from '../utils/response.js';

function makeLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    // Rate limiting would make tests order-dependent and flaky, so it is
    // skipped there. (`limit: 0` must not be used — in express-rate-limit v7
    // that blocks every request rather than disabling the limiter.)
    skip: () => isTest,
    // Authenticated users are limited per-account; anonymous ones per-IP.
    keyGenerator: (req) => req.user?.id || req.ip,
    handler: (_req, res) =>
      sendError(res, { status: 429, code: 'RATE_LIMITED', message }),
  });
}

export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many authentication attempts. Please try again in a few minutes.',
});

/**
 * Guards endpoints that are unauthenticated *and* expensive — anything doing
 * aggregate queries or reaching a third party. These are the cheapest targets
 * for someone trying to exhaust the database rather than steal from it.
 */
export const expensivePublicLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: 'Too many requests. Please try again later.',
});

/**
 * Second-factor attempts: TOTP codes and recovery codes.
 *
 * A 6-digit TOTP is only a million possibilities and a recovery code is a
 * bearer credential, so this is deliberately tighter than the general auth
 * limit. Keyed per-account once a session exists, which is what matters here —
 * the attacker already holds the password.
 */
export const mfaLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many verification attempts. Please wait before trying again.',
});

export const apiLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: 'Too many requests. Please slow down.',
});

// AI calls hit a paid upstream provider, so they are limited far more strictly.
export const aiLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: 'AI request limit reached. Please wait before trying again.',
});

export const publicLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  message: 'Too many requests. Please try again later.',
});
