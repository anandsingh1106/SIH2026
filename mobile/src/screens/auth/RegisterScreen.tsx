import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../services/auth/authContext';
import { isSupabaseConfigured } from '@arogyasetu/shared/services/auth';
import type { UserRole } from '@arogyasetu/shared/types';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

// Same 36-district reference list as frontend/src/data/mockData.ts's
// MAHARASHTRA_DISTRICTS (official district names, not fabricated data).
const MAHARASHTRA_DISTRICTS = [
  'Ahmednagar', 'Akola', 'Amravati', 'Chhatrapati Sambhajinagar', 'Beed',
  'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli',
  'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur',
  'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded',
  'Nandurbar', 'Nashik', 'Dharashiv', 'Palghar', 'Parbhani',
  'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
  'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal',
];

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'patient', label: 'Citizen / Patient' },
  { value: 'asha', label: 'ASHA Worker' },
  { value: 'doctor', label: 'Medical Officer (PHC/CHC)' },
  { value: 'specialist', label: 'Specialist Clinician' },
  { value: 'admin', label: 'Health Administrator' },
];

/** Mirrors frontend/src/pages/auth/Register.tsx. */
export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const configured = isSupabaseConfigured();

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Pune');
  const [taluka, setTaluka] = useState('Mulshi');
  const [village] = useState('Paud');
  const [abhaNumber, setAbhaNumber] = useState('');
  const [isGeneratedAbha, setIsGeneratedAbha] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleGenerateAbha = () => {
    const abha =
      '91-' + Math.floor(1000 + Math.random() * 9000) +
      '-' + Math.floor(1000 + Math.random() * 9000) +
      '-' + Math.floor(1000 + Math.random() * 9000);
    setAbhaNumber(abha);
    setIsGeneratedAbha(true);
  };

  const handleSubmit = async () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp(email, password, {
        name,
        role,
        phone: phone || undefined,
        district,
        taluka,
        village,
        abhaId: abhaNumber || undefined,
        registrationNumber: registrationNumber || undefined,
        facilityName: facilityName || undefined,
      });

      if (needsEmailConfirmation) {
        setConfirmationSent(true);
      }
      // Otherwise RootNavigator swaps to the right stack once
      // isAuthenticated (or the access-pending state) flips.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
    } finally {
      setIsLoading(false);
    }
  };

  if (confirmationSent) {
    return (
      <View style={styles.confirmContainer}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmIcon}>✓</Text>
          <Text style={styles.confirmTitle}>Check your email</Text>
          <Text style={styles.confirmText}>
            We sent a confirmation link to <Text style={styles.confirmEmail}>{email}</Text>. Tap it
            to activate your account, then sign in.
          </Text>
          <Pressable style={styles.submitButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.submitButtonText}>Go to Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>+</Text>
        </View>
        <Text style={styles.title}>Create Healthcare / ABHA Account</Text>
        <Text style={styles.subtitle}>Join Maharashtra's integrated public health network</Text>
      </View>

      <View style={styles.card}>
        {!configured && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Registration is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and
              EXPO_PUBLIC_SUPABASE_ANON_KEY to mobile/.env, then restart Expo.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Account Role</Text>
        <Pressable style={styles.picker} onPress={() => setRolePickerOpen(!rolePickerOpen)}>
          <Text style={styles.pickerText}>{ROLE_OPTIONS.find((r) => r.value === role)?.label}</Text>
        </Pressable>
        {rolePickerOpen && (
          <View style={styles.pickerList}>
            {ROLE_OPTIONS.map((r) => (
              <Pressable
                key={r.value}
                style={styles.pickerRow}
                onPress={() => {
                  setRole(r.value);
                  setRolePickerOpen(false);
                }}
              >
                <Text style={styles.pickerRowText}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {role !== 'patient' && (
          <View style={styles.staffNotice}>
            <Text style={styles.staffNoticeTitle}>Staff access needs approval</Text>
            <Text style={styles.staffNoticeText}>
              Your account is created straight away as a citizen account. A district administrator
              reviews the details below before clinical access is granted.
            </Text>
          </View>
        )}

        {role !== 'patient' && (
          <>
            <Text style={styles.label}>
              {role === 'asha'
                ? 'ASHA / employee ID'
                : role === 'admin'
                ? 'Government employee ID'
                : 'HPR ID or medical council registration number'}
            </Text>
            <TextInput
              style={styles.input}
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              placeholder="Used to verify you against the official register"
            />
            <Text style={styles.label}>Facility / posting</Text>
            <TextInput
              style={styles.input}
              value={facilityName}
              onChangeText={setFacilityName}
              placeholder="e.g. PHC Paud"
            />
          </>
        )}

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Ramesh Tukaram Patil" />

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
          placeholder="At least 8 characters"
          secureTextEntry
          autoComplete="new-password"
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter password"
          secureTextEntry
          autoComplete="new-password"
        />

        <Text style={styles.label}>Mobile Number (optional)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 98500 44332"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>District</Text>
        <Pressable style={styles.picker} onPress={() => setDistrictPickerOpen(!districtPickerOpen)}>
          <Text style={styles.pickerText}>{district}</Text>
        </Pressable>
        {districtPickerOpen && (
          <ScrollView style={styles.pickerListScroll} nestedScrollEnabled>
            {MAHARASHTRA_DISTRICTS.map((d) => (
              <Pressable
                key={d}
                style={styles.pickerRow}
                onPress={() => {
                  setDistrict(d);
                  setDistrictPickerOpen(false);
                }}
              >
                <Text style={styles.pickerRowText}>{d}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Text style={styles.label}>Taluka / Block</Text>
        <TextInput style={styles.input} value={taluka} onChangeText={setTaluka} placeholder="e.g. Mulshi" />

        <View style={styles.abhaBox}>
          <View style={styles.abhaHeader}>
            <Text style={styles.abhaTitle}>Ayushman Bharat Health Account (ABHA)</Text>
            <Pressable onPress={handleGenerateAbha}>
              <Text style={styles.abhaGenerate}>{isGeneratedAbha ? 'Regenerate' : 'Generate ABHA ID'}</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.input}
            value={abhaNumber}
            onChangeText={setAbhaNumber}
            placeholder="14-digit ABHA (e.g. 91-4521-8890-1200)"
          />
        </View>

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.submitButton, (!configured || isLoading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!configured || isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Create Account</Text>}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
          <Text style={styles.linkText}>Already have an account? Sign In</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  container: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  title: { fontSize: 19, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  notice: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, padding: 12, marginBottom: 16 },
  noticeText: { color: '#92400E', fontSize: 11 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  picker: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  pickerText: { fontSize: 14, color: '#111827', fontWeight: '600' },
  pickerList: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginTop: 6, maxHeight: 200 },
  pickerListScroll: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginTop: 6, maxHeight: 200 },
  pickerRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerRowText: { fontSize: 13, color: '#374151' },
  staffNotice: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, marginTop: 8 },
  staffNoticeTitle: { fontSize: 11, fontWeight: '700', color: '#111827' },
  staffNoticeText: { fontSize: 10, color: '#6B7280', marginTop: 4, lineHeight: 14 },
  abhaBox: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 16 },
  abhaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  abhaTitle: { fontSize: 12, fontWeight: '700', color: '#111827' },
  abhaGenerate: { fontSize: 11, fontWeight: '700', color: '#15803D' },
  error: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, padding: 12, marginTop: 16 },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '500' },
  submitButton: { backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  loginLink: { alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  linkText: { color: '#15803D', fontSize: 12, fontWeight: '600' },
  confirmContainer: { flex: 1, backgroundColor: '#FAF9F6', justifyContent: 'center', padding: 24 },
  confirmCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  confirmIcon: { fontSize: 40, color: '#059669', marginBottom: 12 },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  confirmText: { fontSize: 13, color: '#4B5563', textAlign: 'center', marginTop: 10, lineHeight: 19 },
  confirmEmail: { fontWeight: '700', color: '#111827' },
});
