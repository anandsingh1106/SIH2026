import { getSupabaseAdmin, isSupabaseConfigured } from '../lib/supabase/server.js';
import { AppError, AuthenticationError } from '../utils/errors.js';

/**
 * Verifies Supabase access tokens — replaces Firebase Admin SDK token checks.
 *
 * The token is validated by asking Supabase who it belongs to, so a forged or
 * expired token cannot pass. Identity always comes from this call, never from
 * anything the client claims about itself.
 */
/**
 * Reads the assurance level out of an access token.
 *
 * SECURITY: the claims are read *only* after getUser() has authenticated the
 * token against Supabase. Decoding a JWT proves nothing on its own — anyone can
 * craft one claiming `aal2` — so this must never be called on an unverified
 * token. `aal2` means Supabase itself accepted a second factor for this session.
 */
function readAssuranceClaims(accessToken) {
  try {
    const [, payload] = accessToken.split('.');
    if (!payload) return { aal: null, amr: [] };

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return {
      aal: claims.aal ?? null,
      amr: Array.isArray(claims.amr) ? claims.amr.map((entry) => entry.method) : [],
    };
  } catch {
    // A token that verified but will not decode is not something to guess at.
    return { aal: null, amr: [] };
  }
}

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
  const { aal, amr } = readAssuranceClaims(accessToken);

  return {
    authUserId: user.id,
    email: user.email,
    emailConfirmed: Boolean(user.email_confirmed_at),
    // aal2 = a second factor was presented for this session. Trustworthy here
    // because the token was authenticated above before the claims were read.
    assuranceLevel: aal,
    mfaSatisfied: aal === 'aal2',
    authMethods: amr,
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
