import 'react-native-get-random-values';
// Side-effect import: registers the mobile Supabase client provider with the
// shared supabaseAuth module before anything calls it.
import './services/auth/supabaseClient';
// Side-effect import: registers the backend's absolute URL before any
// apiClient call is made.
import './services/api/apiBaseUrl';

/**
 * Runs once before the app renders. Everything here is a one-time,
 * order-sensitive side effect (polyfills, provider registration) — the
 * per-session work of registering the auth adapter and restoring a saved
 * token happens in AuthProvider itself, since that is what owns the
 * currentUser state the restore feeds into.
 */
export function bootstrap(): void {
  // Intentionally empty beyond the imports above: importing this module is
  // what runs their side effects. Kept as a function so App.tsx has one
  // explicit, readable call site instead of a bare side-effect import.
}
