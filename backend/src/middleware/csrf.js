import crypto from 'crypto';
import { isProduction } from '../config/env.js';
import { AuthorizationError } from '../utils/errors.js';

export const CSRF_COOKIE = 'csrfToken';
export const CSRF_HEADER = 'x-csrf-token';

// Safe methods do not change state, so they are exempt (RFC 9110 §9.2.1).
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Endpoints that establish or end a session, and so cannot require a token
 * that only exists once a session is established.
 *
 * These are not a CSRF risk. Both are authorised by something the attacker's
 * site cannot supply — sign-in by a Supabase access token in the request body,
 * sign-out by having nothing worth forging. Cross-site login forgery would at
 * worst sign the victim into the attacker's own account, which the pending
 * session cookie cannot escalate.
 */
const SESSION_ENDPOINTS = new Set(['/api/auth/session', '/api/auth/logout']);

/**
 * Double-submit cookie CSRF protection.
 *
 * The session cookie is httpOnly and `sameSite: lax`, which stops cross-site
 * form posts in modern browsers but is not a guarantee: `lax` still permits
 * top-level GET navigation, and older or misconfigured clients may not honour
 * it at all. This adds an independent check.
 *
 * The token is a readable (non-httpOnly) cookie that the frontend echoes back
 * in a header. An attacker's site can cause the browser to *send* our cookies,
 * but the same-origin policy stops it from *reading* them, so it cannot
 * populate the header. Comparison is constant-time.
 */
export function issueCsrfToken(res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    // Deliberately readable by JavaScript — the frontend must echo it back.
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
  return token;
}

export function clearCsrfToken(res) {
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  // Signing in must work from a cold browser, and from one still holding a
  // stale session cookie left over from a previous deployment. Requiring a
  // CSRF token here locks such a user out of the very endpoint that would
  // issue them one.
  // originalUrl is used rather than req.path because this runs mounted under
  // /api, where req.path is relative. Defaulted so a caller that does not set
  // it cannot crash the check.
  const requestPath = (req.originalUrl || req.url || '').split('?')[0];
  if (SESSION_ENDPOINTS.has(requestPath)) return next();

  // Requests authenticated by a bearer token are not cookie-driven and so are
  // not forgeable this way.
  if (req.get('authorization')?.startsWith('Bearer ')) return next();

  // No session cookie means nothing to forge against.
  if (!req.cookies?.token) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
    return next(
      new AuthorizationError(
        'Your session security token is missing or invalid. Refresh the page and try again.'
      )
    );
  }

  next();
}
