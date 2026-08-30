import { userRepository } from '../repositories/userRepository.js';
import { verifyToken } from '../services/tokenService.js';
import { isMfaRequiredForRole } from '../services/mfaService.js';
import { AuthenticationError, AuthorizationError, AppError } from '../utils/errors.js';

export const ROLES = ['PATIENT', 'ASHA', 'DOCTOR', 'SPECIALIST', 'ADMIN'];

/**
 * Verifies the session cookie and loads the user from the database.
 * The role always comes from the database row, never from the token payload
 * or any client-supplied field.
 */
export function requireAuth(req, _res, next) {
  const token = req.cookies?.token;
  if (!token) return next(new AuthenticationError());

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(new AuthenticationError('Your session is invalid or has expired.'));
  }

  const user = userRepository.findById(payload.sub);
  if (!user) return next(new AuthenticationError('Your account no longer exists.'));
  if (user.status !== 'ACTIVE') {
    return next(new AuthorizationError('Your account is not active. Contact an administrator.'));
  }

  req.user = user;
  // Recorded at sign-in; see requireMfa for what is done with it.
  req.sessionAal = payload.aal === 'aal2' ? 'aal2' : 'aal1';
  next();
}

/**
 * Blocks a session that has not satisfied this account's 2FA requirement.
 *
 * Two distinct failures, kept distinct so the client can route correctly:
 *   MFA_ENROLMENT_REQUIRED — a staff account with no factor at all
 *   MFA_REQUIRED           — a factor exists but was not used for this session
 *
 * Both return 403 with a machine-readable code. This runs *after* requireAuth,
 * and is the control that makes 2FA real: without it the policy would be
 * advisory, enforced only by a frontend that an attacker does not have to use.
 */
export function requireMfa(req, _res, next) {
  if (!req.user) return next(new AuthenticationError());

  const enrolled = Boolean(req.user.mfa_enrolled_at);
  const satisfied = req.sessionAal === 'aal2';

  if (enrolled && !satisfied) {
    return next(
      new AppError('This session needs two-factor verification.', {
        status: 403,
        code: 'MFA_REQUIRED',
      })
    );
  }

  if (isMfaRequiredForRole(req.user.role) && !enrolled) {
    return next(
      new AppError('Two-factor authentication must be set up before continuing.', {
        status: 403,
        code: 'MFA_ENROLMENT_REQUIRED',
      })
    );
  }

  next();
}

/**
 * Requires that this session actually presented a second factor.
 *
 * mfaGate already blocks an enrolled user's password-only session, but this is
 * applied explicitly to the few endpoints where the consequence of being wrong
 * is severe — granting a role, or resetting someone's 2FA. Defence in depth: if
 * the gate's exemption list ever grows carelessly, these stay protected.
 */
export function requireVerifiedMfa(req, _res, next) {
  if (!req.user) return next(new AuthenticationError());

  if (req.sessionAal !== 'aal2') {
    return next(
      new AppError('Verify with your authenticator before performing this action.', {
        status: 403,
        code: 'MFA_REQUIRED',
      })
    );
  }
  next();
}

/** Requires exactly one of the given roles. Must run after requireAuth. */
export function requireRole(...roles) {
  const allowed = roles.flat();
  return (req, _res, next) => {
    if (!req.user) return next(new AuthenticationError());
    if (!allowed.includes(req.user.role)) {
      return next(new AuthorizationError(`This action requires one of: ${allowed.join(', ')}.`));
    }
    next();
  };
}

export const requireAnyRole = requireRole;

/** Attaches req.user when a valid session exists, but never rejects. */
export function optionalAuth(req, _res, next) {
  const token = req.cookies?.token;
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    const user = userRepository.findById(payload.sub);
    if (user && user.status === 'ACTIVE') req.user = user;
  } catch {
    // An invalid token is treated as anonymous on optional routes.
  }
  next();
}
