import { getSupabaseAdmin, isSupabaseConfigured } from '../lib/supabase/server.js';
import { AppError, AuthenticationError } from '../utils/errors.js';

/**
 * Verifies Supabase access tokens — replaces Firebase Admin SDK token checks.
 *
 * The token is validated by asking Supabase who it belongs to, so a forged or
 * expired token cannot pass. Identity always comes from this call, never from
 * anything the client claims about itself.
 */
export async function verifySupabaseToken(accessToken) {
  if (!isSupabaseConfigured()) {
    throw new AppError(
      'Supabase is not configured on the server. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.',
      { status: 503, code: 'SUPABASE_NOT_CONFIGURED' }
    );
  }

  const { data, error } = await getSupabaseAdmin().auth.getUser(accessToken);

  if (error || !data?.user) {
    throw new AuthenticationError('Your session is invalid or has expired.');
  }

  const user = data.user;
  const metadata = user.user_metadata || {};

  return {
    authUserId: user.id,
    email: user.email,
    emailConfirmed: Boolean(user.email_confirmed_at),
    // Profile hints captured at signup. Treated as untrusted input: the role
    // stored in our own users table is authoritative.
    profileHints: {
      name: metadata.name,
      role: metadata.role,
      phone: metadata.phone || user.phone,
      district: metadata.district,
      taluka: metadata.taluka,
      village: metadata.village,
      abhaId: metadata.abha_id,
    },
  };
}
