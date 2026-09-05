import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../services/auth/authContext';
import { isSupabaseConfigured } from '@arogyasetu/shared/services/auth';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

/**
 * Mirrors frontend/src/pages/auth/Login.tsx: same sign-in call, same
 * mfa.action branching. Where web navigates by URL, this navigates by
 * screen name — RootNavigator picks up the post-MFA role stacks once
 * isAuthenticated flips, so this screen only needs to route the MFA cases.
 */
export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const configured = isSupabaseConfigured();

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { mfa } = await signIn(email, password);

      if (mfa.action === 'verify') {
        navigation.navigate('VerifyTwoFactor');
        return;
      }
      if (mfa.action === 'enrol') {
        navigation.navigate('SetupTwoFactor');
        return;
      }
      // mfa.action === 'none': RootNavigator swaps to the role stack once
      // isAuthenticated flips, so there is nothing further to navigate to.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>+</Text>
        </View>
        <Text style={styles.title}>Sign In to MahaAarogya Sangam</Text>
        <Text style={styles.subtitle}>Government of Maharashtra Digital Public Health Platform</Text>
      </View>

      <View style={styles.card}>
        {!configured && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Sign-in is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and
              EXPO_PUBLIC_SUPABASE_ANON_KEY to mobile/.env, then restart Expo.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          autoComplete="current-password"
          secureTextEntry
        />

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotLink}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>

        <Pressable
          style={[styles.submitButton, (!configured || isLoading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!configured || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Sign In</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
          <Text style={styles.linkText}>New here? Create an Account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6', padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#15803D',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB',
  },
  notice: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, padding: 12, marginBottom: 16 },
  noticeText: { color: '#92400E', fontSize: 11 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  error: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, padding: 12, marginTop: 12 },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '500' },
  forgotLink: { alignSelf: 'flex-end', marginTop: 12 },
  linkText: { color: '#15803D', fontSize: 12, fontWeight: '600' },
  submitButton: {
    backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  registerLink: { alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
});
