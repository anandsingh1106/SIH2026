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
  currentToken = await tokenStore.get();
}

export async function setSessionToken(token: string): Promise<void> {
  currentToken = token;
  await tokenStore.set(token);
}

export async function clearSessionToken(): Promise<void> {
  currentToken = null;
  await tokenStore.clear();
}

/**
 * React Native has no cookie jar, so every request authenticates with a
 * bearer header instead of the web app's session cookie + CSRF pair.
 */
export const rnAuthAdapter: AuthTransportAdapter = {
  useCredentials: false,
  getAuthHeaders() {
    return currentToken ? { Authorization: `Bearer ${currentToken}` } : null;
  },
};
