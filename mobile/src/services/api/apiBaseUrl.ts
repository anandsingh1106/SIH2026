import { setApiBaseUrl } from '@arogyasetu/shared/services/api';

/**
 * Registers the backend's absolute URL for React Native's fetch calls.
 *
 * Web calls a relative `/api/...` path, which Vite's dev proxy (or, in
 * production, same-origin hosting) resolves against the backend — see
 * frontend/vite.config.ts. React Native has no such proxy and no page origin
 * to resolve a relative path against, so every request needs an absolute
 * host. EXPO_PUBLIC_API_URL should point at the backend's LAN address (the
 * same one Expo itself is reachable on), e.g. http://192.168.1.10:4000.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (apiUrl) {
  setApiBaseUrl(apiUrl);
} else if (__DEV__) {
  console.warn(
    'EXPO_PUBLIC_API_URL is not set in mobile/.env — API calls will fail. ' +
    'Set it to the backend\'s LAN address, e.g. http://192.168.1.10:4000.'
  );
}
