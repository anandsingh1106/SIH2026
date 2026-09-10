import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { useAuth } from '../services/auth/authContext';
import { LandingScreen } from '../screens/public/LandingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { SetupTwoFactorScreen } from '../screens/auth/SetupTwoFactorScreen';
import { VerifyTwoFactorScreen } from '../screens/auth/VerifyTwoFactorScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Unauthenticated screens, plus the two 2FA steps — mirrors web's /, /login,
 * /register, /forgot-password, /setup-2fa, /verify-2fa routes.
 *
 * Landing is first for an anonymous visitor, so they arrive where web's /
 * does rather than on a password field.
 *
 * RootNavigator also routes a signed-in user with an outstanding second factor
 * here, and that user must not land on the marketing page — they are mid
 * sign-in. initialRouteName sends them straight to the step they owe, which is
 * what web does by redirecting to /setup-2fa or /verify-2fa.
 */
export function AuthStackNavigator() {
  const { currentUser, mfaAction } = useAuth();

  const initialRoute: keyof AuthStackParamList =
    currentUser && mfaAction === 'verify'
      ? 'VerifyTwoFactor'
      : currentUser && mfaAction === 'enrol'
        ? 'SetupTwoFactor'
        : 'Landing';

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="SetupTwoFactor" component={SetupTwoFactorScreen} />
      <Stack.Screen name="VerifyTwoFactor" component={VerifyTwoFactorScreen} />
    </Stack.Navigator>
  );
}
