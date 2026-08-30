import crypto from 'crypto';
import { getDb, transaction } from '../db/connection.js';
import { getSupabaseAdmin } from '../lib/supabase/server.js';
import { recordAudit } from './auditService.js';
import { logger } from '../utils/logger.js';
import { AppError, NotFoundError } from '../utils/errors.js';

/**
 * Two-factor policy and recovery codes.
 *
 * Supabase owns the TOTP factor itself — enrolment, the shared secret, and code
 * verification. This module owns the questions Supabase cannot answer for us:
 * who is *required* to have 2FA, and what happens when someone loses their
 * phone.
 */

/**
 * Roles that must complete enrolment before reaching any patient data.
 *
 * These are the accounts that can read records belonging to other people, so a
 * stolen password on any of them is a breach of someone else's health data.
 * PATIENT is deliberately excluded: a patient account reaches only its own
 * record, and rural users may share a basic handset or lose an authenticator
 * with no realistic recovery path. Patients may still opt in.
 */
export const MFA_REQUIRED_ROLES = ['ADMIN', 'DOCTOR', 'SPECIALIST', 'ASHA'];

const RECOVERY_CODE_COUNT = 10;
// 10 bytes of base32 is ~50 bits of entropy — far beyond guessing, while still
// short enough to read off paper.
const RECOVERY_CODE_BYTES = 10;

export function isMfaRequiredForRole(role) {
  return MFA_REQUIRED_ROLES.includes(role);
}

/** True when this user must enrol before being allowed to continue. */
export function mustEnrolMfa(user) {
  return isMfaRequiredForRole(user.role) && !user.mfa_enrolled_at;
}

// Crockford-style base32 without I/L/O/U: avoids characters a user can misread
// as 1/0, and avoids accidental words in a code.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function generateCode() {
  const bytes = crypto.randomBytes(RECOVERY_CODE_BYTES);
  let out = '';
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  // Grouped for legibility when copied off a printout.
  return `${out.slice(0, 5)}-${out.slice(5)}`;
}

/** Recovery codes are compared by hash, so normalise formatting first. */
function normalise(code) {
  return String(code || '').trim().toUpperCase().replace(/[\s-]/g, '');
}

function hashCode(code) {
  return crypto.createHash('sha256').update(normalise(code)).digest('hex');
}

/**
 * Issues a fresh set of recovery codes, replacing any that already exist.
 *
 * Returns the plaintext codes. This is the only time they are available — only
 * hashes are stored, so a lost set must be regenerated rather than recovered.
 */
export function generateRecoveryCodes(user, requestMeta = {}) {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateCode);
  const createdAt = new Date().toISOString();

  transaction((db) => {
    // Regenerating invalidates the previous set, so an old printout cannot be
    // used after the user has replaced it.
    db.prepare('DELETE FROM mfa_recovery_codes WHERE user_id = ?').run(user.id);

    const insert = db.prepare(`
      INSERT INTO mfa_recovery_codes (id, user_id, code_hash, used_at, created_at)
      VALUES (?, ?, ?, NULL, ?)
    `);
    for (const code of codes) {
      insert.run(crypto.randomUUID(), user.id, hashCode(code), createdAt);
    }

    recordAudit(
      {
        actorId: user.id,
        action: 'MFA_RECOVERY_CODES_GENERATED',
        entityType: 'user',
        entityId: user.id,
        newValues: { count: codes.length },
        ...requestMeta,
      },
      db
    );
  });

  return codes;
}

export function countUnusedRecoveryCodes(userId, db = getDb()) {
  return db
    .prepare('SELECT COUNT(*) AS c FROM mfa_recovery_codes WHERE user_id = ? AND used_at IS NULL')
    .get(userId).c;
}

/**
 * Consumes one recovery code. Returns true when it was valid and unused.
 *
 * Single-use by design: a code that has been spent is worthless to anyone who
 * later finds the printout.
 */
export function consumeRecoveryCode(user, code, requestMeta = {}) {
  if (!normalise(code)) return false;

  return transaction((db) => {
    const row = db
      .prepare(`
        SELECT id FROM mfa_recovery_codes
        WHERE user_id = ? AND code_hash = ? AND used_at IS NULL
      `)
      .get(user.id, hashCode(code));

    if (!row) {
      recordAudit(
        {
          actorId: user.id,
          action: 'MFA_RECOVERY_CODE_REJECTED',
          entityType: 'user',
          entityId: user.id,
          ...requestMeta,
        },
        db
      );
      return false;
    }

    db.prepare('UPDATE mfa_recovery_codes SET used_at = ? WHERE id = ?')
      .run(new Date().toISOString(), row.id);

    const remaining = db
      .prepare('SELECT COUNT(*) AS c FROM mfa_recovery_codes WHERE user_id = ? AND used_at IS NULL')
      .get(user.id).c;

    recordAudit(
      {
        actorId: user.id,
        action: 'MFA_RECOVERY_CODE_USED',
        entityType: 'user',
        entityId: user.id,
        newValues: { remaining },
        ...requestMeta,
      },
      db
    );

    return true;
  });
}

/** Records that enrolment completed, after Supabase has verified the factor. */
export function markEnrolled(user, requestMeta = {}, db = getDb()) {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET mfa_enrolled_at = ?, updated_at = ? WHERE id = ?')
    .run(now, now, user.id);

  recordAudit(
    {
      actorId: user.id,
      action: 'MFA_ENROLLED',
      entityType: 'user',
      entityId: user.id,
      ...requestMeta,
    },
    db
  );
}

/**
 * Reads a user's verified TOTP factors straight from Supabase.
 *
 * Our own `mfa_enrolled_at` is a mirror kept for policy checks; Supabase is the
 * source of truth. Anywhere the answer must be trustworthy rather than merely
 * fast, ask Supabase.
 */
export async function listVerifiedFactors(authUserId) {
  // An account not yet linked to Supabase genuinely has no factors. This is a
  // real answer, not a lookup failure.
  if (!authUserId) return [];

  let result;
  try {
    result = await getSupabaseAdmin().auth.admin.mfa.listFactors({ userId: authUserId });
  } catch (err) {
    // The client throws (rather than returning an error) when it is
    // unconfigured or the id is malformed. Treating that as "no factors" would
    // fail open: a staff account would look un-enrolled and be waved through
    // enrolment, or an enrolled one would have its mirror wrongly cleared.
    logger.error('MFA factor lookup threw', { message: err?.message });
    throw new AppError('Could not read two-factor status. Please try again.', {
      status: 502,
      code: 'MFA_LOOKUP_FAILED',
    });
  }

  if (result.error) {
    logger.error('Failed to list MFA factors', { message: result.error.message });
    throw new AppError('Could not read two-factor status. Please try again.', {
      status: 502,
      code: 'MFA_LOOKUP_FAILED',
    });
  }

  return (result.data?.factors || []).filter((f) => f.status === 'verified');
}

/**
 * Reconciles our mirror with Supabase.
 *
 * The two can drift: a factor removed directly in the Supabase dashboard, or an
 * enrolment that completed while our write failed. Trusting a stale mirror
 * would either lock out a legitimate user or, worse, treat an unenrolled staff
 * account as protected.
 */
export async function syncEnrolmentState(user, db = getDb()) {
  // Nothing to reconcile against. Clearing enrolment here would strip 2FA from
  // an account purely because its Supabase link is missing, so the existing
  // state stands — the gate then still requires a factor that is on record.
  if (!user.auth_user_id) return user;

  const factors = await listVerifiedFactors(user.auth_user_id);
  const enrolled = factors.length > 0;
  const now = new Date().toISOString();

  if (enrolled && !user.mfa_enrolled_at) {
    db.prepare('UPDATE users SET mfa_enrolled_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, user.id);
    return { ...user, mfa_enrolled_at: now };
  }

  if (!enrolled && user.mfa_enrolled_at) {
    db.prepare('UPDATE users SET mfa_enrolled_at = NULL, updated_at = ? WHERE id = ?')
      .run(now, user.id);
    return { ...user, mfa_enrolled_at: null };
  }

  return user;
}

/**
 * Removes every TOTP factor for a user and clears their recovery codes.
 *
 * Used by an administrator when someone has lost both their phone and their
 * codes. Identity must be confirmed out of band first — this call is the last
 * step of that process, not the whole of it.
 */
export async function resetMfaForUser(actor, targetUserId, requestMeta = {}) {
  const db = getDb();
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
  if (!target) throw new NotFoundError('User');

  const factors = await listVerifiedFactors(target.auth_user_id);

  for (const factor of factors) {
    const { error } = await getSupabaseAdmin().auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: target.auth_user_id,
    });
    if (error) {
      logger.error('Failed to delete MFA factor', { message: error.message });
      throw new AppError('Could not reset two-factor authentication. Please try again.', {
        status: 502,
        code: 'MFA_RESET_FAILED',
      });
    }
  }

  transaction((tx) => {
    const now = new Date().toISOString();
    tx.prepare('DELETE FROM mfa_recovery_codes WHERE user_id = ?').run(target.id);
    tx.prepare(
      'UPDATE users SET mfa_enrolled_at = NULL, mfa_reset_at = ?, updated_at = ? WHERE id = ?'
    ).run(now, now, target.id);

    recordAudit(
      {
        actorId: actor.id,
        action: 'MFA_RESET_BY_ADMIN',
        entityType: 'user',
        entityId: target.id,
        oldValues: { mfaEnrolled: true },
        newValues: { mfaEnrolled: false, factorsRemoved: factors.length },
        ...requestMeta,
      },
      tx
    );
  });

  return { factorsRemoved: factors.length };
}
