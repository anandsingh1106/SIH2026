import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../services/auth/authContext';
import { authApi } from '@arogyasetu/shared/services/auth';
import * as supabaseAuth from '@arogyasetu/shared/services/auth';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetupTwoFactor'>;
type Step = 'loading' | 'scan' | 'codes' | 'error';

/**
 * Mirrors frontend/src/pages/auth/SetupTwoFactor.tsx. Renders the QR
 * directly from the otpauth:// URI via react-native-qrcode-svg instead of
 * the web version's canvas-rendered data URL from the `qrcode` package.
 * Drops the "Download codes as .txt" action — there is no file-save flow on
 * mobile without extra permissions — and keeps Copy, which works the same
 * way via the clipboard.
 */
export function SetupTwoFactorScreen(_props: Props) {
  const { completeMfa } = useAuth();

  const [step, setStep] = useState<Step>('loading');
  const [factorId, setFactorId] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const beginEnrolment = useCallback(async () => {
    setStep('loading');
    setError('');
    try {
      const enrolment = await supabaseAuth.enrolTotp();
      setFactorId(enrolment.factorId);
      setSecret(enrolment.secret);
      setQrUri(enrolment.qrCodeUri);
      setStep('scan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start setup.');
      setStep('error');
    }
  }, []);

  useEffect(() => {
    void beginEnrolment();
  }, [beginEnrolment]);

  const handleVerify = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const accessToken = await supabaseAuth.verifyTotp(factorId, code);
      const { recoveryCodes: codes } = await authApi.mfa.completeEnrolment(accessToken);
      setRecoveryCodes(codes);
      setStep('codes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.');
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCodes = async () => {
    try {
      await Clipboard.setStringAsync(recoveryCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically — please write the codes down.');
    }
  };

  const finish = () => {
    completeMfa();
    // RootNavigator swaps to the right role stack once mfaAction flips.
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>🛡</Text>
        </View>
        <Text style={styles.title}>Set Up Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Required for staff accounts, because they can open other people's health records.
        </Text>
      </View>

      <View style={styles.card}>
        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {step === 'loading' && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#15803D" />
            <Text style={styles.loadingText}>Preparing your authenticator…</Text>
          </View>
        )}

        {step === 'error' && (
          <View>
            <Text style={styles.bodyText}>Setup could not be started. This is usually temporary.</Text>
            <Pressable style={styles.submitButton} onPress={() => void beginEnrolment()}>
              <Text style={styles.submitButtonText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {step === 'scan' && (
          <>
            <Text style={styles.stepText}>1. Install an authenticator app (Google Authenticator, Authy, or similar).</Text>
            <Text style={styles.stepText}>2. Scan this code with it.</Text>
            <Text style={styles.stepText}>3. Enter the 6-digit number it shows.</Text>

            <View style={styles.qrWrap}>
              {qrUri ? <QRCode value={qrUri} size={200} /> : null}
            </View>

            <Pressable onPress={() => setShowSecret(!showSecret)}>
              <Text style={styles.linkText}>Can't scan the code?</Text>
            </Pressable>
            {showSecret && (
              <View style={styles.secretBox}>
                <Text style={styles.secretHint}>Enter this key into your app by hand:</Text>
                <Text style={styles.secretText}>{secret}</Text>
              </View>
            )}

            <Text style={styles.label}>6-digit code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
            />
            <Pressable
              style={[styles.submitButton, (isSubmitting || code.length !== 6) && styles.submitButtonDisabled]}
              onPress={handleVerify}
              disabled={isSubmitting || code.length !== 6}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Verify and continue</Text>
              )}
            </Pressable>
          </>
        )}

        {step === 'codes' && (
          <>
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>
                <Text style={styles.warnBold}>Save these now.</Text> They are shown only once. Each
                one works a single time and lets you sign in if you lose your phone.
              </Text>
            </View>

            <View style={styles.codesGrid}>
              {recoveryCodes.map((rc) => (
                <View key={rc} style={styles.codeBox}>
                  <Text style={styles.codeText}>{rc}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.copyBtn} onPress={copyCodes}>
              <Text style={styles.copyBtnText}>{copied ? '✓ Copied' : 'Copy all codes'}</Text>
            </Pressable>

            <Pressable style={styles.checkboxRow} onPress={() => setConfirmedSaved(!confirmedSaved)}>
              <View style={[styles.checkbox, confirmedSaved && styles.checkboxChecked]}>
                {confirmedSaved ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={styles.checkboxLabel}>I have saved these codes somewhere safe.</Text>
            </Pressable>

            <Pressable
              style={[styles.submitButton, !confirmedSaved && styles.submitButtonDisabled]}
              onPress={finish}
              disabled={!confirmedSaved}
            >
              <Text style={styles.submitButtonText}>Continue to ArogyaSetu</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  container: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { fontSize: 24 },
  title: { fontSize: 19, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  error: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, padding: 12, marginBottom: 14 },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '500' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 24 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  bodyText: { fontSize: 13, color: '#4B5563', marginBottom: 14 },
  stepText: { fontSize: 12, color: '#4B5563', marginBottom: 4 },
  qrWrap: { alignItems: 'center', marginVertical: 16 },
  linkText: { fontSize: 12, color: '#15803D', fontWeight: '600', marginTop: 8 },
  secretBox: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, marginTop: 8 },
  secretHint: { fontSize: 11, color: '#6B7280' },
  secretText: { fontSize: 11, fontFamily: 'monospace', color: '#111827', marginTop: 4 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, letterSpacing: 4, textAlign: 'center' },
  submitButton: { backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  warnBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, padding: 12 },
  warnText: { fontSize: 12, color: '#92400E', lineHeight: 17 },
  warnBold: { fontWeight: '800' },
  codesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  codeBox: { width: '47%', backgroundColor: '#F3F4F6', borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  codeText: { fontFamily: 'monospace', fontSize: 12, color: '#111827' },
  copyBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 14 },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#15803D', borderColor: '#15803D' },
  checkboxMark: { color: '#fff', fontSize: 11, fontWeight: '800' },
  checkboxLabel: { fontSize: 11, color: '#4B5563', flex: 1 },
});
