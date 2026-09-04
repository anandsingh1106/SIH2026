import 'react-native-get-random-values';
import { setAuthTransportAdapter } from '@arogyasetu/shared/services/api';
import { rnAuthAdapter, loadStoredToken } from './services/api/rnAuthAdapter';

/**
 * Runs once before the app renders. Registers this platform's auth adapter
 * with the shared apiClient and restores whatever session token was saved
 * from a previous launch, so a cold start with a valid session does not
 * bounce through the login screen.
 */
export async function bootstrap(): Promise<void> {
  setAuthTransportAdapter(rnAuthAdapter);
  await loadStoredToken();
}
