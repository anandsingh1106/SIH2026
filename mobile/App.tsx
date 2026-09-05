import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { bootstrap } from './src/bootstrap';
import { AuthProvider } from './src/services/auth/authContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// Runs once at module load, before the first render: registers polyfills
// and the platform's Supabase client provider. AuthProvider's own effect
// handles the async, per-session part (auth adapter + stored token restore)
// and renders its own loading state while that resolves.
bootstrap();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AuthProvider>
  );
}
