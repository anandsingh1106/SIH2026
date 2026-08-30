import {
  generateRecoveryCodes,
  countUnusedRecoveryCodes,
  consumeRecoveryCode,
  markEnrolled,
  listVerifiedFactors,
  syncEnrolmentState,
  resetMfaForUser,
  isMfaRequiredForRole,
} from '../services/mfaService.js';
import { verifySupabaseToken } from '../services/supabaseAuthService.js';
import { setSessionCookie } from '../services/tokenService.js';
import { issueCsrfToken } from '../middleware/csrf.js';
import { recordAudit } from '../services/auditService.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { getDb } from '../db/connection.js';

function requestMeta(req) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') };
}

/** Current two-factor status for the signed-in user. */
export async function getStatus(req, res, next) {
  try {
    // Ask Supabase rather than trusting our mirror: a factor removed in the
    // dashboard must show as un-enrolled here too.
    const user = await syncEnrolmentState(req.user);

    return sendSuccess(res, {
      required: isMfaRequiredForRole(user.role),
      enrolled: Boolean(user.mfa_enrolled_at),
      satisfied: req.sessionAal === 'aal2',
      recoveryCodesRemaining: user.mfa_enrolled_at
        ? countUnusedRecoveryCodes(user.id)
        : 0,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Completes enrolment.
 *
 * The TOTP secret and the code check belong to Supabase: the client enrols and
 * verifies there, then posts the resulting aal2 token here. We confirm that
 * token really is aal2 with a verified factor behind it before recording
 * enrolment — the client's word for it is not enough.
 */
export async function postEnrolComplete(req, res, next) {
  try {
    const { accessToken } = req.body;
    const verified = await verifySupabaseToken(accessToken);

    if (verified.authUserId !== req.user.auth_user_id) {
      throw new AppError('This token belongs to a different account.', {
        status: 403,
        code: 'MFA_TOKEN_MISMATCH',
      });
    }

    if (!verified.mfaSatisfied) {
      throw new AppError('Enter the code from your authenticator app to finish setup.', {
        status: 400,
        code: 'MFA_NOT_VERIFIED',
      });
    }

    // Belt and braces: aal2 should imply a verified factor, but enrolment is
    // exactly the moment to confirm rather than infer.
    const factors = await listVerifiedFactors(verified.authUserId);
    if (factors.length === 0) {
      throw new AppError('No verified authenticator was found on this account.', {
        status: 400,
        code: 'MFA_NO_FACTOR',
      });
    }

    markEnrolled(req.user, requestMeta(req));

    // Codes are returned once, here. Only hashes are stored.
    const recoveryCodes = generateRecoveryCodes(req.user, requestMeta(req));

    // Re-issue the session at aal2 so the user is not immediately blocked by
    // the gate they just satisfied.
    const user = getDb().prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    setSessionCookie(res, user, { mfaSatisfied: true });
    const csrfToken = issueCsrfToken(res);

    return sendSuccess(res, { recoveryCodes, csrfToken }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Upgrades an existing password-only session to aal2.
 *
 * Called after the client completes a TOTP challenge with Supabase. The new
 * access token is proof; we verify it and re-issue our own cookie.
 */
export async function postVerify(req, res, next) {
  try {
    const { accessToken } = req.body;
    const verified = await verifySupabaseToken(accessToken);

    if (verified.authUserId !== req.user.auth_user_id) {
      throw new AppError('This token belongs to a different account.', {
        status: 403,
        code: 'MFA_TOKEN_MISMATCH',
      });
    }

    if (!verified.mfaSatisfied) {
      throw new AppError('That code was not accepted. Please try again.', {
        status: 400,
        code: 'MFA_NOT_VERIFIED',
      });
    }

    recordAudit({
      actorId: req.user.id,
      action: 'MFA_VERIFIED',
      entityType: 'user',
      entityId: req.user.id,
      ...requestMeta(req),
    });

    setSessionCookie(res, req.user, { mfaSatisfied: true });
    const csrfToken = issueCsrfToken(res);

    return sendSuccess(res, { verified: true, csrfToken });
  } catch (err) {
    next(err);
  }
}

/**
 * Signs in with a recovery code when the authenticator is unavailable.
 *
 * A valid code is treated as satisfying the second factor for this session
 * only — it is consumed, and the user is told how many remain so they know
 * when to regenerate.
 */
export async function postRecovery(req, res, next) {
  try {
    const { code } = req.body;

    if (!consumeRecoveryCode(req.user, code, requestMeta(req))) {
      // Deliberately vague: distinguishing "wrong" from "already used" would
      // confirm which codes were real to someone holding a stolen list.
      throw new AppError('That recovery code is not valid.', {
        status: 400,
        code: 'MFA_RECOVERY_INVALID',
      });
    }

    setSessionCookie(res, req.user, { mfaSatisfied: true });
    const csrfToken = issueCsrfToken(res);

    return sendSuccess(res, {
      verified: true,
      remaining: countUnusedRecoveryCodes(req.user.id),
      csrfToken,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Replaces the user's recovery codes.
 *
 * Requires a session that already satisfied 2FA, so a stolen password alone
 * cannot mint a fresh set of bypass credentials.
 */
export function postRegenerateRecoveryCodes(req, res, next) {
  try {
    if (req.sessionAal !== 'aal2') {
      throw new AppError('Verify with your authenticator before regenerating codes.', {
        status: 403,
        code: 'MFA_REQUIRED',
      });
    }

    const recoveryCodes = generateRecoveryCodes(req.user, requestMeta(req));
    return sendSuccess(res, { recoveryCodes }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin reset for a user who has lost both their device and their codes.
 *
 * Identity must be confirmed out of band first; this is the last step of that
 * process, not the whole of it. Always audited, naming the acting admin.
 */
export async function postAdminReset(req, res, next) {
  try {
    const { userId } = req.params;

    if (req.sessionAal !== 'aal2') {
      throw new AppError('Verify with your authenticator before resetting another account.', {
        status: 403,
        code: 'MFA_REQUIRED',
      });
    }

    const result = await resetMfaForUser(req.user, userId, requestMeta(req));
    return sendSuccess(res, {
      message: 'Two-factor authentication has been reset. The user must enrol again at next sign-in.',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}
