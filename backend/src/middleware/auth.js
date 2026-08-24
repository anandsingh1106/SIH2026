import { userRepository } from '../repositories/userRepository.js';
import { verifyToken } from '../services/tokenService.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';

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
