import * as SecureStore from 'expo-secure-store';

const KEY = 'arogyasetu.sessionToken';

/**
 * Where the bearer token lives on device. SecureStore is backed by Keychain
 * on iOS and EncryptedSharedPreferences on Android — appropriate for a
 * long-lived session credential, unlike AsyncStorage which is unencrypted.
 */
export const tokenStore = {
  async get(): Promise<string | null> {
    return SecureStore.getItemAsync(KEY);
  },
  async set(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEY, token);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY);
  },
};
