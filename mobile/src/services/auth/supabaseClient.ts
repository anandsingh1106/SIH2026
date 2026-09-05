import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { setSupabaseClientProvider } from '@arogyasetu/shared/services/auth';

/**
 * Mobile Supabase client.
 *
 * Metro has no `import.meta.env` (that's a Vite construct), so config comes
 * from `EXPO_PUBLIC_`-prefixed vars instead, which Expo inlines at build time
 * the same way Vite inlines `VITE_`-prefixed ones.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to mobile/.env.'
    );
  }

  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        // AsyncStorage in place of the web client's default (browser
        // localStorage, which does not exist here).
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        // No URL to detect a session in — this is not a browser tab.
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}

setSupabaseClientProvider({
  isConfigured: isSupabaseConfigured,
  getClient: getSupabase,
});
