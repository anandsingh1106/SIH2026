import { logger } from '../utils/logger.js';

/**
 * Tracks failed authentication attempts and locks an identity out temporarily.
 *
 * The IP-based rate limiter alone does not stop a distributed credential-stuffing
 * run: with a botnet, each IP stays under the limit while one account is hammered
 * from thousands of sources. This tracks the *target* as well as the source, so
 * an account under attack locks regardless of where the traffic comes from.
 *
 * In-process and therefore per-instance. A multi-instance deployment should back
 * this with Redis so a lockout is shared across the fleet — the interface here
 * is deliberately small enough to swap.
 */
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
// Bounds memory so a flood of unique keys cannot exhaust the heap.
const MAX_TRACKED_KEYS = 10_000;

const attempts = new Map();

function prune(now) {
  for (const [key, entry] of attempts) {
    if (entry.lockedUntil && entry.lockedUntil <= now) attempts.delete(key);
    else if (!entry.lockedUntil && now - entry.firstAt > WINDOW_MS) attempts.delete(key);
  }

  // Still oversized after pruning: drop the oldest entries.
  if (attempts.size > MAX_TRACKED_KEYS) {
    const sorted = [...attempts.entries()].sort((a, b) => a[1].firstAt - b[1].firstAt);
    for (const [key] of sorted.slice(0, attempts.size - MAX_TRACKED_KEYS)) {
      attempts.delete(key);
    }
  }
}

/** Returns remaining lockout milliseconds, or 0 when not locked. */
export function checkLockout(key) {
  if (!key) return 0;
  const entry = attempts.get(key);
  if (!entry?.lockedUntil) return 0;

  const remaining = entry.lockedUntil - Date.now();
  if (remaining <= 0) {
    attempts.delete(key);
    return 0;
  }
  return remaining;
}

export function recordFailure(key) {
  if (!key) return;
  const now = Date.now();
  prune(now);

  const entry = attempts.get(key) || { count: 0, firstAt: now, lockedUntil: null };

  // A stale window starts over rather than accumulating across hours.
  if (now - entry.firstAt > WINDOW_MS && !entry.lockedUntil) {
    entry.count = 0;
    entry.firstAt = now;
  }

  entry.count += 1;

  if (entry.count >= MAX_FAILURES) {
    entry.lockedUntil = now + LOCKOUT_MS;
    logger.warn('Authentication lockout triggered', { key, failures: entry.count });
  }

  attempts.set(key, entry);
}

/** Clears the counter after a successful sign-in. */
export function recordSuccess(key) {
  if (key) attempts.delete(key);
}

/** Test seam. */
export function resetAttempts() {
  attempts.clear();
}
