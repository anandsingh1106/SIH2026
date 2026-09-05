import { AuthTransportAdapter } from '@arogyasetu/shared/services/api';
import { tokenStore } from './tokenStore';

/**
 * `getAuthHeaders` on the shared apiClient is synchronous (the web adapter
 * only ever does a synchronous cookie read), but SecureStore is async. So the
 * current token is kept in memory here, loaded once at startup and updated
 * on every sign-in/sign-out — the adapter itself never awaits.
 */
let currentToken: string | null = null;

export async function loadStoredToken(): Promise<void> {
  try {
    currentToken = await tokenStore.get();
  } catch {
    // No usable store on this platform/session (e.g. SecureStore has no web
    // implementation) — start signed out rather than leaving the app stuck
    // on its loading screen forever.
    currentToken = null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  // The in-memory copy is what getAuthHeaders actually reads, so the session
  // is usable immediately regardless of whether persistence below succeeds —
  // it only controls whether the session survives an app restart.
  currentToken = token;
  await tokenStore.set(token).catch(() => undefined);
}

export async function clearSessionToken(): Promise<void> {
  currentToken = null;
  await tokenStore.clear().catch(() => undefined);
}

/**
 * React Native has no cookie jar, so every request — reads included, unlike
 * the web adapter's CSRF header which only guards state-changing ones —
 * authenticates with a bearer header instead of the web app's session
 * cookie. Omitting it on GET would leave every read unauthenticated.
 */
export const rnAuthAdapter: AuthTransportAdapter = {
  useCredentials: false,
  getAuthHeaders() {
    return currentToken ? { Authorization: `Bearer ${currentToken}` } : null;
  },
};
