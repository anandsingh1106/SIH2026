import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import type { Patient } from '@arogyasetu/shared/types';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'RegisterPatient'>;

const GENDERS: Patient['gender'][] = ['female', 'male', 'other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RISK_TIERS: Patient['riskCategory'][] = ['normal', 'moderate', 'high', 'critical'];

const STEP_TITLES = ['Demographics & ABHA', 'Address & Village', 'Baseline Vitals', 'Emergency & Consent'];

/**
 * Mirrors frontend/src/pages/asha/RegisterPatient.tsx's 4-step wizard and
 * its ABHA policy exactly: the field is optional, never fabricated, and
 * registration proceeds identically either way — care is not blocked on it.
 * canvas-confetti (web-only) is dropped rather than replaced for this pass;
 * the success screen still confirms clearly without it.
 */
export function RegisterPatientScreen({ navigation }: Props) {
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<Patient>>({
    name: '',
    nameMr: '',
    age: 32,
    gender: 'female',
    phone: '',
    address: '',
    village: 'Paud',
    taluka: 'Mulshi',
    district: 'Pune',
    pincode: '412108',
    bloodGroup: 'B+',
    allergies: [],
    chronicConditions: [],
    emergencyContact: { name: '', relationship: 'Spouse', phone: '' },
    vitals: { bpSystolic: 120, bpDiastolic: 80, pulse: 76, spo2: 98, temperature: 98.4, bloodSugarRandom: 110 },
    riskCategory: 'normal',
  });

  const abhaEntered = Boolean(formData.abhaId?.trim());

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newPatient: Patient = {
        id: 'pat-' + Date.now(),
        abhaId: formData.abhaId?.trim() || '',
        name: formData.name || 'New Registered Patient',
        nameMr: formData.nameMr,
        age: formData.age || 30,
        gender: formData.gender || 'female',
        phone: formData.phone || '+91 98000 00000',
        address: formData.address || 'Paud Village',
        village: formData.village || 'Paud',
        taluka: formData.taluka || 'Mulshi',
        district: formData.district || 'Pune',
        pincode: formData.pincode || '412108',
        bloodGroup: formData.bloodGroup || 'O+',
        allergies: formData.allergies || [],
        chronicConditions: formData.chronicConditions || [],
        emergencyContact: formData.emergencyContact || { name: 'Family', relationship: 'Spouse', phone: '+91 98000 00000' },
        vitals: formData.vitals,
        riskCategory: formData.riskCategory || 'normal',
        registeredDate: new Date().toISOString().slice(0, 10),
      };

      await dataService.savePatient(newPatient);
      setIsSuccess(true);
    } finally {
      setIsSaving(false);
    }
  };

  const setEmergency = (field: 'name' | 'relationship' | 'phone', value: string) =>
    setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact!, [field]: value } });

  if (isSuccess) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Patient Registered Successfully!</Text>
        <Text style={styles.successBody}>
          {formData.name} has been registered.{' '}
          {abhaEntered
            ? `ABHA number ${formData.abhaId} recorded against this patient.`
            : 'No ABHA number on file — the patient can be linked later at any facility. Care is not blocked while it is pending.'}{' '}
          Record saved and queued for server sync.
        </Text>
        <View style={styles.successActions}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              setIsSuccess(false);
              setStep(1);
              setFormData({ ...formData, name: '', nameMr: '', phone: '' });
            }}
          >
            <Text style={styles.secondaryButtonText}>Register Another</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('HomeVisits')}>
            <Text style={styles.primaryButtonText}>Record Home Visit →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.stepper}>
        {STEP_TITLES.map((title, i) => (
          <View key={title} style={[styles.stepPill, step === i + 1 && styles.stepPillActive]}>
            <Text style={[styles.stepPillText, step === i + 1 && styles.stepPillTextActive]}>{i + 1}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.stepTitle}>{STEP_TITLES[step - 1]}</Text>

      <ScrollView style={styles.form}>
        {step === 1 && (
          <>
            <Text style={styles.label}>Patient Full Name (English)</Text>
            <TextInput style={styles.input} value={formData.name} onChangeText={(v) => setFormData({ ...formData, name: v })} placeholder="e.g. Vandana Suresh Jadhav" />

            <Text style={styles.label}>Full Name (मराठी)</Text>
            <TextInput style={styles.input} value={formData.nameMr} onChangeText={(v) => setFormData({ ...formData, nameMr: v })} placeholder="उदा. वंदना सुरेश जाधव" />

            <Text style={styles.label}>Age in Years</Text>
            <TextInput style={styles.input} value={String(formData.age ?? '')} onChangeText={(v) => setFormData({ ...formData, age: parseInt(v, 10) || 0 })} keyboardType="number-pad" />

            <Text style={styles.label}>Gender</Text>
            <View style={styles.chipRow}>
              {GENDERS.map((g) => (
                <Pressable key={g} style={[styles.chip, formData.gender === g && styles.chipActive]} onPress={() => setFormData({ ...formData, gender: g })}>
                  <Text style={[styles.chipText, formData.gender === g && styles.chipTextActive]}>{g[0].toUpperCase() + g.slice(1)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Mobile Number</Text>
            <TextInput style={styles.input} value={formData.phone} onChangeText={(v) => setFormData({ ...formData, phone: v })} placeholder="+91 97654 32109" keyboardType="phone-pad" />

            <View style={styles.abhaBox}>
              <View style={styles.abhaBoxHeader}>
                <Text style={styles.abhaBoxTitle}>Ayushman Bharat Health Account (ABHA number)</Text>
                <Text style={styles.abhaBoxOptional}>Optional</Text>
              </View>
              <TextInput
                style={styles.input}
                value={formData.abhaId || ''}
                onChangeText={(v) => setFormData({ ...formData, abhaId: v })}
                placeholder="14-digit ABHA number, if the patient has one"
                keyboardType="number-pad"
              />
              <Text style={styles.abhaBoxNote}>
                Leave blank if the patient does not have one. Registration continues either way — an ABHA
                number is issued by ABDM against Aadhaar or mobile verification and cannot be created here.
              </Text>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.label}>House Number & Street / Pada Name</Text>
            <TextInput style={styles.input} value={formData.address} onChangeText={(v) => setFormData({ ...formData, address: v })} placeholder="House No. 78, Gaothan Pada" />

            <Text style={styles.label}>Village / Gram Panchayat</Text>
            <TextInput style={styles.input} value={formData.village} onChangeText={(v) => setFormData({ ...formData, village: v })} />

            <Text style={styles.label}>Taluka / Block</Text>
            <TextInput style={styles.input} value={formData.taluka} onChangeText={(v) => setFormData({ ...formData, taluka: v })} />

            <Text style={styles.label}>District</Text>
            <TextInput style={styles.input} value={formData.district} onChangeText={(v) => setFormData({ ...formData, district: v })} />
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.label}>Blood Pressure — Systolic</Text>
            <TextInput
              style={styles.input}
              value={String(formData.vitals?.bpSystolic ?? '')}
              onChangeText={(v) => setFormData({ ...formData, vitals: { ...formData.vitals, bpSystolic: parseInt(v, 10) || undefined } })}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>Blood Pressure — Diastolic</Text>
            <TextInput
              style={styles.input}
              value={String(formData.vitals?.bpDiastolic ?? '')}
              onChangeText={(v) => setFormData({ ...formData, vitals: { ...formData.vitals, bpDiastolic: parseInt(v, 10) || undefined } })}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>Pulse</Text>
            <TextInput
              style={styles.input}
              value={String(formData.vitals?.pulse ?? '')}
              onChangeText={(v) => setFormData({ ...formData, vitals: { ...formData.vitals, pulse: parseInt(v, 10) || undefined } })}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>SpO2 (%)</Text>
            <TextInput
              style={styles.input}
              value={String(formData.vitals?.spo2 ?? '')}
              onChangeText={(v) => setFormData({ ...formData, vitals: { ...formData.vitals, spo2: parseInt(v, 10) || undefined } })}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Blood Group</Text>
            <View style={styles.chipRow}>
              {BLOOD_GROUPS.map((bg) => (
                <Pressable key={bg} style={[styles.chip, formData.bloodGroup === bg && styles.chipActive]} onPress={() => setFormData({ ...formData, bloodGroup: bg })}>
                  <Text style={[styles.chipText, formData.bloodGroup === bg && styles.chipTextActive]}>{bg}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Triage Vulnerability Tier</Text>
            <View style={styles.chipRow}>
              {RISK_TIERS.map((r) => (
                <Pressable key={r} style={[styles.chip, formData.riskCategory === r && styles.chipActive]} onPress={() => setFormData({ ...formData, riskCategory: r })}>
                  <Text style={[styles.chipText, formData.riskCategory === r && styles.chipTextActive]}>{r[0].toUpperCase() + r.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Text style={styles.sectionLabel}>Emergency Contact Person</Text>
            <Text style={styles.label}>Contact Name</Text>
            <TextInput style={styles.input} value={formData.emergencyContact?.name} onChangeText={(v) => setEmergency('name', v)} placeholder="e.g. Suresh Jadhav" />
            <Text style={styles.label}>Relationship</Text>
            <TextInput style={styles.input} value={formData.emergencyContact?.relationship} onChangeText={(v) => setEmergency('relationship', v)} placeholder="e.g. Husband / Mother" />
            <Text style={styles.label}>Emergency Phone</Text>
            <TextInput style={styles.input} value={formData.emergencyContact?.phone} onChangeText={(v) => setEmergency('phone', v)} placeholder="+91 97654 32110" keyboardType="phone-pad" />

            <View style={styles.consentBox}>
              <Text style={styles.consentText}>
                Informed Consent Declaration: The patient has been informed and given oral/written consent
                for registration in Maharashtra Health Grid under National Health Mission protocols. Data
                remains private and protected.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.navRow}>
        {step > 1 ? (
          <Pressable style={styles.secondaryButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.secondaryButtonText}>Previous</Text>
          </Pressable>
        ) : <View />}

        {step < 4 ? (
          <Pressable style={styles.primaryButton} onPress={() => setStep(step + 1)}>
            <Text style={styles.primaryButtonText}>Next Step →</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryButton} onPress={handleSave} disabled={isSaving}>
            <Text style={styles.primaryButtonText}>{isSaving ? 'Saving…' : 'Save & Register'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  stepper: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  stepPill: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  stepPillActive: { backgroundColor: '#15803D' },
  stepPillText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  stepPillTextActive: { color: '#fff' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginBottom: 12 },
  form: { flex: 1, paddingHorizontal: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#111827', textTransform: 'uppercase', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: '#15803D' },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  abhaBox: { backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, marginTop: 16 },
  abhaBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  abhaBoxTitle: { fontSize: 12, fontWeight: '700', color: '#111827', flex: 1 },
  abhaBoxOptional: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  abhaBoxNote: { fontSize: 11, color: '#6B7280', marginTop: 8, lineHeight: 16 },
  consentBox: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 12, padding: 14, marginTop: 16 },
  consentText: { fontSize: 11, color: '#166534', lineHeight: 16 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  primaryButton: { backgroundColor: '#15803D', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  secondaryButton: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  secondaryButtonText: { color: '#374151', fontWeight: '700', fontSize: 13 },
  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FAF9F6' },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successIconText: { fontSize: 36, color: '#15803D' },
  successTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12, textAlign: 'center' },
  successBody: { fontSize: 13, color: '#4B5563', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  successActions: { flexDirection: 'row', gap: 12 },
});
