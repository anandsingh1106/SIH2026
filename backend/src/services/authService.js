import { transaction } from '../db/connection.js';
import { userRepository } from '../repositories/userRepository.js';
import { verifySupabaseToken } from './supabaseAuthService.js';
import { recordAudit } from './auditService.js';
import { AppError } from '../utils/errors.js';
import { isMfaRequiredForRole, syncEnrolmentState } from './mfaService.js';
import { roleFromApi } from '../utils/mappers.js';

/**
 * Exchanges a Supabase access token for an application session.
 *
 * The token is verified with Supabase, then matched to a local `users` row.
 * On first sign-in the row is provisioned from the signup metadata.
 *
 * Returns { user, created, mfa }, where `mfa` describes what the caller still
 * has to do before the session is usable:
 *   required   — this role must have 2FA
 *   enrolled   — a verified factor exists
 *   satisfied  — a second factor was presented for *this* session (aal2)
 *   action     — 'none' | 'enrol' | 'verify'
 */
export async function supabaseLogin({ accessToken, profile, requestMeta }) {
  const verified = await verifySupabaseToken(accessToken);

  // A user linked by auth id is already provisioned.
  const existing =
    userRepository.findByAuthUserId(verified.authUserId) ||
    (verified.email ? userRepository.findByEmail(verified.email) : null);

  if (existing) {
    // Reconcile against Supabase before deciding policy: a factor deleted in the
    // dashboard must not leave a stale "enrolled" flag standing in for real 2FA.
    const synced = await syncEnrolmentState(existing);

    return transaction((db) => {
      // Link the auth id the first time we see this account.
      if (!existing.auth_user_id) {
        userRepository.linkAuthUserId(existing.id, verified.authUserId, db);
      }
      userRepository.touchLastLogin(existing.id, db);
      recordAudit(
        {
          actorId: existing.id, action: 'LOGIN', entityType: 'user', entityId: existing.id,
          newValues: { aal: verified.assuranceLevel },
          ...requestMeta,
        },
        db
      );

      const user = userRepository.findById(existing.id, db);
      return { user, created: false, mfa: mfaState(user, synced, verified) };
    });
  }

  // New account: profile fields come from the request body, falling back to the
  // metadata captured at signup.
  const hints = verified.profileHints;
  const name = profile?.name || hints.name;
  const role = profile?.role || hints.role;
  const phone = profile?.phone || hints.phone;

  if (!name || !role) {
    throw new AppError('This account has no profile yet. Please complete registration.', {
      status: 400,
      code: 'NEW_USER',
      details: { email: verified.email },
    });
  }

  return transaction((db) => {
    const user = userRepository.create(
      {
        authUserId: verified.authUserId,
        name,
        // Phone stays unique in our schema; synthesise a placeholder when the
        // account was created with email only.
        phone: phone || `email:${verified.email}`,
        email: verified.email,
        role: roleFromApi(role),
        district: profile?.district || hints.district,
        taluka: profile?.taluka || hints.taluka,
        village: profile?.village || hints.village,
        abhaId: profile?.abhaId || hints.abhaId,
      },
      db
    );

    userRepository.touchLastLogin(user.id, db);
    recordAudit(
      {
        actorId: user.id, action: 'REGISTER', entityType: 'user', entityId: user.id,
        newValues: { role: user.role, district: user.district }, ...requestMeta,
      },
      db
    );

    const created = userRepository.findById(user.id, db);
    // A brand-new account has no factor yet, so a staff role lands on 'enrol'.
    return { user: created, created: true, mfa: mfaState(created, created, verified) };
  });
}

/**
 * Describes the outstanding second-factor step for this session.
 *
 * 'verify' means the user has a factor but signed in with only a password — the
 * client must complete the TOTP challenge and exchange the resulting aal2 token.
 */
function mfaState(user, synced, verified) {
  const required = isMfaRequiredForRole(user.role);
  const enrolled = Boolean(synced?.mfa_enrolled_at);
  const satisfied = Boolean(verified.mfaSatisfied);

  let action = 'none';
  if (enrolled && !satisfied) action = 'verify';
  else if (required && !enrolled) action = 'enrol';

  return { required, enrolled, satisfied, action };
}
