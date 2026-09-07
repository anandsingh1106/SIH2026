import { NativeModules, Platform } from 'react-native';
import { setApiBaseUrl } from '@arogyasetu/shared/services/api';

/**
 * Works out the backend's absolute URL for React Native's fetch calls.
 *
 * Web calls a relative `/api/...` path, which Vite's dev proxy (or, in
 * production, same-origin hosting) resolves against the backend — see
 * frontend/vite.config.ts. React Native has no such proxy and no page origin
 * to resolve a relative path against, so every request needs an absolute host.
 *
 * That host used to be pinned in mobile/.env, which meant re-editing the file
 * on every network change (hotel wifi, a phone hotspot, a different campus
 * LAN). Instead we read it from the Expo dev server the bundle was just
 * downloaded from: whatever address the phone reached to load this JavaScript
 * is, by definition, an address the phone can reach the dev machine on, and
 * the backend runs on that same machine. Swapping networks now needs nothing
 * but a restart of Expo.
 */

/** The port the backend listens on — backend/src/config/env.js defaults to 4000. */
const API_PORT = Number(process.env.EXPO_PUBLIC_API_PORT) || 4000;

/**
 * Rewrites the running bundle's origin to the backend's port.
 *
 * SourceCode.scriptURL is where this JavaScript was downloaded from — in
 * development, the Expo packager, e.g. `http://10.209.9.130:8081/index.bundle`.
 * The host is what we want; the packager's port and path are not. Returns null
 * for a production or offline bundle, whose scriptURL is a local `file://`
 * path with no host to borrow.
 */
function apiUrlFromDevServer(): string | null {
  try {
    const scriptURL: unknown = NativeModules?.SourceCode?.getConstants?.().scriptURL;
    if (typeof scriptURL !== 'string') return null;

    // No URL class guarantee across RN versions/polyfills, so match directly.
    // A `file://` bundle has no `//host` to match and correctly falls through.
    const match = scriptURL.match(/^(https?):\/\/([^/:]+)/);
    if (!match) return null;

    const [, protocol, host] = match;

    // A bundle served from localhost means the packager and the app share a
    // machine — a simulator, or Expo's web target. localhost is then correct
    // and a LAN address would be the wrong guess.
    return `${protocol}://${host}:${API_PORT}`;
  } catch {
    // This reads a native module; never let that break startup.
    return null;
  }
}

/**
 * The Android emulator reaches its host machine through this alias — its own
 * localhost is the emulated device. Simulators on iOS share the host's
 * loopback, so localhost already works there.
 */
function emulatorFallback(): string {
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:${API_PORT}`;
}

// An explicit override still wins, for the cases the automatic answer cannot
// cover: a backend on a different machine than Expo, a tunnel, or a deployed
// staging API. Left unset, everything below is worked out at runtime.
const explicit = process.env.EXPO_PUBLIC_API_URL;
const fromDevServer = explicit ? null : apiUrlFromDevServer();
const resolved = explicit || fromDevServer || emulatorFallback();

setApiBaseUrl(resolved);

if (__DEV__) {
  const source = explicit
    ? 'EXPO_PUBLIC_API_URL'
    : fromDevServer
      ? 'the Expo dev server host'
      : 'the emulator fallback';
  console.log(`[api] backend base URL: ${resolved} (from ${source})`);
}

export { resolved as apiBaseUrl };
