import { supabaseLogin } from '../services/authService.js';
import { setSessionCookie, clearSessionCookie } from '../services/tokenService.js';
import { issueCsrfToken, clearCsrfToken } from '../middleware/csrf.js';
import { recordAudit } from '../services/auditService.js';
import { checkLockout, recordFailure, recordSuccess } from '../services/loginAttemptService.js';
import { AppError } from '../utils/errors.js';
import { toPublicUser } from '../utils/mappers.js';
import { sendSuccess } from '../utils/response.js';

function requestMeta(req) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') };
}

/**
 * Exchanges a Supabase access token for this app's own session cookie.
 *
 * The frontend authenticates with Supabase directly, then posts the resulting
 * access token here. We verify it server-side and issue an httpOnly cookie so
 * the rest of the API keeps its existing session model.
 */
export async function postSupabaseLogin(req, res, next) {
  const attemptKey = `ip:${req.ip}`;

  try {
    const lockedFor = checkLockout(attemptKey);
    if (lockedFor > 0) {
      const minutes = Math.ceil(lockedFor / 60000);
      throw new AppError(
        `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        { status: 429, code: 'ACCOUNT_LOCKED' }
      );
    }

    const { accessToken, ...profile } = req.body;

    let result;
    try {
      result = await supabaseLogin({
        accessToken,
        profile: profile.name && profile.role ? profile : undefined,
        requestMeta: requestMeta(req),
      });
    } catch (err) {
      // Count only rejected credentials. An incomplete profile (NEW_USER) or an
      // unconfigured server is not an attack, and locking on those would turn a
      // misconfiguration into an outage.
      if (err?.status === 401) {
        recordFailure(attemptKey);
        recordAudit({
          action: 'LOGIN_FAILED',
          entityType: 'user',
          ...requestMeta(req),
        });
      }
      throw err;
    }

    const { user, created } = result;
    recordSuccess(attemptKey);

    setSessionCookie(res, user);
    // Paired with the session: the frontend echoes this back on writes.
    const csrfToken = issueCsrfToken(res);
    return sendSuccess(res, { user: toPublicUser(user), csrfToken }, created ? 201 : 200);
  } catch (err) {
    next(err);
  }
}

export function getMe(req, res) {
  // Re-issue on session restore: the session cookie outlives a page reload, but
  // the CSRF cookie may be absent (cleared, or issued before this was added).
  // Without this a returning user holds a valid session that cannot write.
  const csrfToken = issueCsrfToken(res);
  return sendSuccess(res, { user: toPublicUser(req.user), csrfToken });
}

export function postLogout(req, res) {
  if (req.user) {
    recordAudit({
      actorId: req.user.id,
      action: 'LOGOUT',
      entityType: 'user',
      entityId: req.user.id,
      ...requestMeta(req),
    });
  }
  clearSessionCookie(res);
  clearCsrfToken(res);
  return sendSuccess(res, { message: 'Logged out.' });
}
