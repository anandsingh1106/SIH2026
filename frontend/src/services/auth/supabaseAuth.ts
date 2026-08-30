import { getSupabase, isSupabaseConfigured } from '../../lib/supabase/client';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Supabase Auth wrapper — replaces the Firebase phone-OTP client.
 *
 * Email + password is used because Supabase phone auth requires a paid SMS
 * provider (Twilio/MessageBird), while email works out of the box.
 */

export { isSupabaseConfigured };

export interface SignUpProfile {
  name: string;
  role: string;
  phone?: string;
  district?: string;
  taluka?: string;
  village?: string;
  abhaId?: string;
}

function friendlyError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'Incorrect email or password.',
    'Email not confirmed': 'Please confirm your email address first — check your inbox.',
    'User already registered': 'An account with this email already exists. Please sign in.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters.',
    'Unable to validate email address: invalid format': 'Please enter a valid email address.',
    'For security purposes, you can only request this after 60 seconds':
      'Please wait a minute before trying again.',
  };
  return map[message] || message;
}

export class SupabaseAuthError extends Error {
  constructor(message: string) {
    super(friendlyError(message));
    this.name = 'SupabaseAuthError';
  }
}

/**
 * Creates an account. Profile fields are stored in user_metadata so the backend
 * can provision the matching `users` row on first sign-in.
 *
 * Role is recorded here for convenience only — the backend always re-reads the
 * authoritative role from the database and never trusts this value.
 */
export async function signUp(email: string, password: string, profile: SignUpProfile) {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: {
      data: {
        name: profile.name,
        role: profile.role,
        phone: profile.phone,
        district: profile.district,
        taluka: profile.taluka,
        village: profile.village,
        abha_id: profile.abhaId,
      },
    },
  });

  if (error) throw new SupabaseAuthError(error.message);

  return {
    user: data.user,
    session: data.session,
    // With email confirmation on, session is null until the link is clicked.
    needsEmailConfirmation: !data.session,
  };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw new SupabaseAuthError(error.message);
  return { user: data.user, session: data.session };
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw new SupabaseAuthError(error.message);
}

export async function getSession(): Promise<Session | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<SupabaseUser | null> {
  const { data } = await getSupabase().auth.getUser();
  return data.user;
}

export async function resetPassword(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw new SupabaseAuthError(error.message);
}

export async function updatePassword(newPassword: string) {
  const { error } = await getSupabase().auth.updateUser({ password: newPassword });
  if (error) throw new SupabaseAuthError(error.message);
}

export async function resendConfirmation(email: string) {
  const { error } = await getSupabase().auth.resend({ type: 'signup', email });
  if (error) throw new SupabaseAuthError(error.message);
}

/** Subscribes to sign-in/sign-out. Returns an unsubscribe function. */
export function onAuthStateChange(handler: (session: Session | null) => void) {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => handler(session));
  return () => data.subscription.unsubscribe();
}

/** Access token for calling our own API. */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

// ─── Two-factor (TOTP) ──────────────────────────────────────────────────────
// Supabase owns the factor: the shared secret, the QR payload, and code
// verification. The backend independently confirms the resulting token really
// is aal2 before trusting any of it.

export interface TotpEnrolment {
  factorId: string;
  /** otpauth:// URI, rendered as a QR code. */
  qrCodeUri: string;
  /** Shown so a user can type the key when they cannot scan. */
  secret: string;
}

/**
 * Starts TOTP enrolment. The factor stays unverified until a valid code is
 * submitted, so an abandoned setup leaves nothing usable behind.
 */
export async function enrolTotp(friendlyName = 'ArogyaSetu'): Promise<TotpEnrolment> {
  const { data, error } = await getSupabase().auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `${friendlyName} ${new Date().toISOString().slice(0, 10)}`,
  });

  if (error) throw new SupabaseAuthError(error.message);

  return {
    factorId: data.id,
    qrCodeUri: data.totp.uri,
    secret: data.totp.secret,
  };
}

/**
 * Verifies a code against a factor, completing enrolment or stepping a session
 * up to aal2. Returns the new access token, which the backend re-verifies.
 */
export async function verifyTotp(factorId: string, code: string): Promise<string> {
  const { data, error } = await getSupabase().auth.mfa.challengeAndVerify({
    factorId,
    code: code.replace(/\s/g, ''),
  });

  if (error) throw new SupabaseAuthError(error.message);
  if (!data.access_token) throw new SupabaseAuthError('Verification did not return a session.');

  return data.access_token;
}

/** Removes a factor. Used to clean up an enrolment the user abandoned. */
export async function unenrolTotp(factorId: string) {
  const { error } = await getSupabase().auth.mfa.unenroll({ factorId });
  if (error) throw new SupabaseAuthError(error.message);
}

/** Verified TOTP factors on the current account. */
export async function listTotpFactors() {
  const { data, error } = await getSupabase().auth.mfa.listFactors();
  if (error) throw new SupabaseAuthError(error.message);
  return data.totp ?? [];
}

/**
 * The factor to challenge at sign-in.
 *
 * A user may hold more than one (an old phone plus a new one); any verified
 * factor satisfies the requirement, so the first is used.
 */
export async function getPrimaryTotpFactorId(): Promise<string | null> {
  const factors = await listTotpFactors();
  return factors[0]?.id ?? null;
}
