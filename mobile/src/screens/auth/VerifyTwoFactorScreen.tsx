import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../services/auth/authContext';
import { authApi } from '@arogyasetu/shared/services/auth';
import * as supabaseAuth from '@arogyasetu/shared/services/auth';
import { demoTotpCode, secondsUntilRollover } from '../../utils/demoTotp';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyTwoFactor'>;
type Mode = 'totp' | 'recovery';

/**
 * Mirrors frontend/src/pages/auth/VerifyTwoFactor.tsx, including the
 * demo-account TOTP auto-fill (utils/demoTotp.ts) — pure-JS HMAC-SHA1 here
 * since React Native has no crypto.subtle. Dev-only: __DEV__ is stripped to
 * false in a release build, so the secrets never ship.
 */
export function VerifyTwoFactorScreen({ navigation }: Props) {
  const { currentUser, completeMfa, logout } = useAuth();

  const [mode, setMode] = useState<Mode>('totp');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isDemoFilled, setIsDemoFilled] = useState(false);

  /**
   * Pre-fills the code for a demo account during development. The code is
   * real and still verified by Supabase and the API; this only saves typing
   * it in mid-walkthrough. Refreshes itself when the 30-second window rolls
   * over, so the field never holds a stale code.
   */
  useEffect(() => {
    if (mode !== 'totp' || !currentUser?.email) return;

    const fill = () => {
      const demoCode = demoTotpCode(currentUser.email!);
      if (!demoCode) return;
      setCode(demoCode);
      setIsDemoFilled(true);
    };

    fill();
    const timer = setInterval(fill, (secondsUntilRollover() + 1) * 1000);
    return () => clearInterval(timer);
  }, [mode, currentUser?.email]);

  const handleTotp = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const factorId = await supabaseAuth.getPrimaryTotpFactorId();
      if (!factorId) {
        setError('No authenticator is registered on this account. Use a recovery code instead.');
        setMode('recovery');
        return;
      }
      const accessToken = await supabaseAuth.verifyTotp(factorId, code);
      const { sessionToken } = await authApi.mfa.verify(accessToken);
      await completeMfa(sessionToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.');
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecovery = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const { remaining: left, sessionToken } = await authApi.mfa.useRecoveryCode(code);
      setRemaining(left);
      await completeMfa(sessionToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That recovery code is not valid.');
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setCode('');
    setError('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>{mode === 'totp' ? '🛡' : '🔑'}</Text>
        </View>
        <Text style={styles.title}>{mode === 'totp' ? 'Two-Factor Verification' : 'Use a Recovery Code'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'totp'
            ? 'Enter the 6-digit code from your authenticator app.'
            : 'Enter one of the codes you saved when you set up two-factor authentication.'}
        </Text>
      </View>

      <View style={styles.card}>
        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {remaining !== null && remaining <= 2 && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              Only {remaining} recovery code{remaining === 1 ? '' : 's'} left.
            </Text>
          </View>
        )}

        {mode === 'totp' ? (
          <>
            <Text style={styles.label}>6-digit code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, ''));
                setIsDemoFilled(false);
              }}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            {isDemoFilled ? (
              <Text style={styles.demoHint}>Demo code filled in automatically (development only).</Text>
            ) : null}
            <Pressable
              style={[styles.submitButton, (isSubmitting || code.length !== 6) && styles.submitButtonDisabled]}
              onPress={handleTotp}
              disabled={isSubmitting || code.length !== 6}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Verify</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>Recovery code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder="XXXXX-XXXXX"
              autoCapitalize="characters"
              autoFocus
            />
            <Pressable
              style={[styles.submitButton, (isSubmitting || code.length < 8) && styles.submitButtonDisabled]}
              onPress={handleRecovery}
              disabled={isSubmitting || code.length < 8}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Use recovery code</Text>}
            </Pressable>
          </>
        )}

        <View style={styles.footer}>
          <Pressable onPress={() => switchMode(mode === 'totp' ? 'recovery' : 'totp')}>
            <Text style={styles.linkText}>
              {mode === 'totp' ? 'Lost your phone? Use a recovery code' : 'Use your authenticator app instead'}
            </Text>
          </Pressable>

          <Text style={styles.helpText}>
            Lost both? Ask an administrator to reset your two-factor setup.
          </Text>

          <Pressable onPress={() => void logout().then(() => navigation.navigate('Login'))}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6', padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { fontSize: 24 },
  title: { fontSize: 19, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  error: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, padding: 12, marginBottom: 14 },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '500' },
  warnBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, padding: 12, marginBottom: 14 },
  warnText: { fontSize: 12, color: '#92400E' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  demoHint: { fontSize: 10, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, letterSpacing: 2, textAlign: 'center' },
  submitButton: { backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  footer: { alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 10 },
  linkText: { color: '#15803D', fontSize: 12, fontWeight: '600' },
  helpText: { color: '#6B7280', fontSize: 11, textAlign: 'center' },
  signOutText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
});
