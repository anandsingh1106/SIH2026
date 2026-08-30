import { verifyToken } from '../services/tokenService.js';
import { userRepository } from '../repositories/userRepository.js';
import { isMfaRequiredForRole } from '../services/mfaService.js';
import { AppError } from '../utils/errors.js';

/**
 * Central two-factor gate for the whole API.
 *
 * Applied once in app.js rather than per-router, so a route added later is
 * protected by default. The only way past it is to appear in EXEMPT_PREFIXES
 * below — forgetting to opt in is safe, and opting out is deliberate and
 * reviewable in one place.
 *
 * This is the control that makes the policy real. The frontend routes an
 * unenrolled user to a setup screen, but a frontend is only a suggestion: an
 * attacker with a stolen password calls the API directly. This runs there.
 */

/**
 * Paths reachable before the second factor is satisfied.
 *
 * Deliberately minimal — every entry is a route a half-authenticated user must
 * reach in order to *finish* authenticating, or to leave.
 */
const EXEMPT_PREFIXES = [
  // Public, unauthenticated data. No session involved.
  '/public',
  // Sign-in itself, and the enrolment/verification endpoints. Each performs its
  // own checks; gating them would make completing 2FA impossible.
  '/auth',
  // Health probes for the load balancer.
  '/health',
];

function isExempt(path) {
  return EXEMPT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export function mfaGate(req, _res, next) {
  if (isExempt(req.path)) return next();

  // Anonymous requests are the business of requireAuth on the route itself,
  // which returns a 401. Answering here would turn every unauthenticated call
  // into a confusing 403 about two-factor.
  const token = req.cookies?.token;
  if (!token) return next();

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    // Invalid or expired: again, requireAuth reports this properly as a 401.
    return next();
  }

  const user = userRepository.findById(payload.sub);
  if (!user) return next();

  const enrolled = Boolean(user.mfa_enrolled_at);
  const satisfied = payload.aal === 'aal2';

  // Enrolled but signed in with a password alone. Distinct from the case below
  // so the client knows to prompt for a code rather than restart enrolment.
  if (enrolled && !satisfied) {
    return next(
      new AppError('This session needs two-factor verification.', {
        status: 403,
        code: 'MFA_REQUIRED',
      })
    );
  }

  // A staff account that has never enrolled. Blocked from all patient data
  // until it does.
  if (isMfaRequiredForRole(user.role) && !enrolled) {
    return next(
      new AppError('Two-factor authentication must be set up before continuing.', {
        status: 403,
        code: 'MFA_ENROLMENT_REQUIRED',
      })
    );
  }

  next();
}
