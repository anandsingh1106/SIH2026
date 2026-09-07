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

/**
 * True for an origin whose host is an RFC1918 / link-local IPv4 address:
 * 10.x, 172.16-31.x, 192.168.x, or 169.254.x — the ranges a home, office, or
 * phone-hotspot network hands out.
 */
function isPrivateLanOrigin(origin) {
  const match = origin.match(/^https?:\/\/(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  if (!match) return false;

  const octets = match[1].split('.').map(Number);
  if (octets.some((o) => o > 255)) return false;

  const [a, b] = octets;
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

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

    // Likewise, a developer opening the site from their phone or a second
    // laptop arrives from this machine's LAN address, which changes with every
    // network. Trusting private ranges in development keeps that working
    // without an env edit per network; these addresses are unroutable from the
    // internet, and production still requires the explicit allowlist above.
    if (!isProduction && isPrivateLanOrigin(origin)) {
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
