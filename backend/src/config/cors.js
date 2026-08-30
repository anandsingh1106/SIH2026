import { env, isProduction } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Cross-origin policy.
 *
 * Because the API authenticates with cookies, a permissive origin here would
 * hand any site the ability to read authenticated responses. The allowlist is
 * therefore explicit — `origin: true` (reflect whatever asked) is never safe in
 * combination with `credentials: true`.
 *
 * CORS_ORIGINS may hold a comma-separated list, for staging plus production
 * domains. It falls back to FRONTEND_URL.
 */
const allowlist = (env.CORS_ORIGINS || env.FRONTEND_URL)
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const corsOptions = {
  origin(origin, callback) {
    // Same-origin requests, curl, and server-to-server calls send no Origin.
    // These are not subject to the browser's cross-origin rules at all.
    if (!origin) return callback(null, true);

    if (allowlist.includes(origin.replace(/\/$/, ''))) return callback(null, true);

    // In development a changing localhost port should not be a hard stop.
    if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    logger.warn('Blocked cross-origin request', { origin });
    // Reject by refusing the header rather than throwing a 500.
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-request-id'],
  exposedHeaders: ['x-request-id'],
  maxAge: 600,
};

export { allowlist as corsAllowlist };
