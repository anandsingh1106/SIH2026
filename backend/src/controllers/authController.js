import { supabaseLogin } from '../services/authService.js';
import { setSessionCookie, clearSessionCookie } from '../services/tokenService.js';
import { recordAudit } from '../services/auditService.js';
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
  try {
    const { accessToken, ...profile } = req.body;

    const { user, created } = await supabaseLogin({
      accessToken,
      profile: profile.name && profile.role ? profile : undefined,
      requestMeta: requestMeta(req),
    });

    setSessionCookie(res, user);
    return sendSuccess(res, { user: toPublicUser(user) }, created ? 201 : 200);
  } catch (err) {
    next(err);
  }
}

export function getMe(req, res) {
  return sendSuccess(res, { user: toPublicUser(req.user) });
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
  return sendSuccess(res, { message: 'Logged out.' });
}
