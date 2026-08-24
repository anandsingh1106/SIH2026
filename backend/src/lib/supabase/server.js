import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';

/**
 * Server-side Supabase clients.
 *
 * SECURITY: the service-role key bypasses Row Level Security entirely. It must
 * never be sent to the browser and must never be prefixed with VITE_/NEXT_PUBLIC_.
 * Use the admin client only after the API layer has performed its own
 * authorization check.
 */

let adminClient = null;

/** Full-privilege client. Bypasses RLS — authorize before calling. */
export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.'
    );
  }

  adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

/**
 * Client scoped to one end user's access token.
 *
 * Queries made through it run as that user, so RLS applies. Prefer this over
 * the admin client wherever the user's own permissions are sufficient — it
 * makes the database the second line of defence.
 */
export function getSupabaseForUser(accessToken) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isSupabaseConfigured() {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
