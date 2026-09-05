import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { SetupTwoFactorScreen } from '../screens/auth/SetupTwoFactorScreen';
import { VerifyTwoFactorScreen } from '../screens/auth/VerifyTwoFactorScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Unauthenticated screens, plus the two 2FA steps — mirrors web's /login,
 * /register, /forgot-password, /setup-2fa, /verify-2fa routes.
 */
export function AuthStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="SetupTwoFactor" component={SetupTwoFactorScreen} />
      <Stack.Screen name="VerifyTwoFactor" component={VerifyTwoFactorScreen} />
    </Stack.Navigator>
  );
}
