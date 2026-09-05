import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../services/auth/authContext';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

/** Mirrors frontend/src/pages/auth/ForgotPassword.tsx. */
export function ForgotPasswordScreen({ navigation }: Props) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.');
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
        <Text style={styles.title}>Reset Your Password</Text>
        <Text style={styles.subtitle}>We'll email you a secure link to set a new password</Text>
      </View>

      <View style={styles.card}>
        {sent ? (
          <>
            <View style={styles.sentBox}>
              <Text style={styles.sentTitle}>✓ Reset Link Sent</Text>
              <Text style={styles.sentText}>
                If <Text style={styles.sentEmail}>{email}</Text> is registered, a password reset link
                is on its way. Check your inbox and spam folder.
              </Text>
            </View>
            <Pressable style={styles.outlineButton} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.outlineButtonText}>Return to Sign In</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>Registered Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {error ? (
              <View style={styles.error}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Send Reset Link</Text>}
            </Pressable>
          </>
        )}

        <Pressable onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
          <Text style={styles.linkText}>Remembered your password? Sign In</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6', padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  error: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, padding: 12, marginTop: 12 },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '500' },
  submitButton: { backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sentBox: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 12, padding: 14 },
  sentTitle: { fontSize: 13, fontWeight: '800', color: '#065F46' },
  sentText: { fontSize: 12, color: '#047857', marginTop: 6, lineHeight: 17 },
  sentEmail: { fontWeight: '800', color: '#065F46' },
  outlineButton: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  outlineButtonText: { color: '#374151', fontSize: 13, fontWeight: '700' },
  loginLink: { alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  linkText: { color: '#15803D', fontSize: 12, fontWeight: '600' },
});
