import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, Switch, Modal } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import type { NcdScreening, Patient } from '@arogyasetu/shared/types';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'NcdScreening'>;

/** Mirrors frontend/src/pages/asha/NcdScreening.tsx (CBAC form). */
export function NcdScreeningScreen(_props: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [age, setAge] = useState('45');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [smokeTobacco, setSmokeTobacco] = useState(false);
  const [alcohol, setAlcohol] = useState(false);
  const [waist, setWaist] = useState('86');
  const [physicalActivity, setPhysicalActivity] = useState(true);
  const [familyHistory, setFamilyHistory] = useState(true);

  const [bpSystolic, setBpSystolic] = useState('148');
  const [bpDiastolic, setBpDiastolic] = useState('94');
  const [bloodSugar, setBloodSugar] = useState('182');

  const [oralLesion, setOralLesion] = useState(false);
  const [breastLump, setBreastLump] = useState(false);
  const [cervicalDischarge, setCervicalDischarge] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NcdScreening | null>(null);

  useEffect(() => {
    let cancelled = false;
    dataService.getPatients().then((rows) => {
      if (!cancelled) setPatients(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId),
    [patients, patientId]
  );

  useEffect(() => {
    if (!selectedPatient) return;
    if (selectedPatient.age) setAge(String(selectedPatient.age));
    if (selectedPatient.gender === 'male' || selectedPatient.gender === 'female') {
      setGender(selectedPatient.gender);
    }
  }, [selectedPatient]);

  const likelyNeedsReferral =
    Number(bpSystolic) >= 140 ||
    Number(bpDiastolic) >= 90 ||
    Number(bloodSugar) >= 140 ||
    oralLesion ||
    breastLump ||
    cervicalDischarge;

  const handleSubmit = async () => {
    if (!patientId) {
      setError('Select the citizen being screened.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await dataService.createNcdScreening({
        patientId,
        age: Number(age) || 0,
        bloodPressureSystolic: Number(bpSystolic) || 0,
        bloodPressureDiastolic: Number(bpDiastolic) || 0,
        bloodGlucose: Number(bloodSugar) || 0,
        waistCircumference: Number(waist) || 0,
        tobaccoUse: smokeTobacco,
        alcoholUse: alcohol,
        physicalActivityAdequate: physicalActivity,
        familyHistory,
      });
      setResult(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the screening. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.resultWrap}>
        <View style={styles.resultIcon}>
          <Text style={styles.resultIconText}>✓</Text>
        </View>
        <Text style={styles.resultTitle}>CBAC screening recorded</Text>
        <Text style={styles.resultSubtitle}>
          {result.patientName ?? selectedPatient?.name} screened on{' '}
          {new Date(result.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.
        </Text>

        <View style={styles.resultBadges}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>CBAC SCORE</Text>
            <Text style={styles.scoreValue}>{result.cbacScore ?? '—'}</Text>
          </View>
          {result.riskCategory && (
            <Text
              style={[
                styles.riskBadge,
                result.riskCategory === 'HIGH'
                  ? styles.riskHigh
                  : result.riskCategory === 'MODERATE'
                  ? styles.riskModerate
                  : styles.riskLow,
              ]}
            >
              {result.riskCategory} RISK
            </Text>
          )}
        </View>

        {(result.suspectedHypertension || result.suspectedDiabetes) && (
          <View style={styles.flagsRow}>
            {result.suspectedHypertension && <Text style={styles.flagBadge}>Suspected hypertension</Text>}
            {result.suspectedDiabetes && <Text style={styles.flagBadge}>Suspected diabetes</Text>}
          </View>
        )}

        {result.recommendations?.length > 0 && (
          <View style={styles.recsBox}>
            <Text style={styles.recsTitle}>Recommended actions</Text>
            {result.recommendations.map((rec, i) => (
              <Text key={i} style={styles.recItem}>→ {rec}</Text>
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>
          This is a screening score, not a diagnosis. Confirmatory testing is done by the medical
          officer.
        </Text>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => {
            setResult(null);
            setPatientId('');
          }}
        >
          <Text style={styles.primaryBtnText}>Screen Next Citizen</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.sectionTitle}>1. Individual Demographics</Text>

      <Text style={styles.fieldLabel}>Citizen *</Text>
      <Pressable style={styles.pickerBtn} onPress={() => setPickerOpen(true)}>
        <Text style={selectedPatient ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
          {selectedPatient
            ? `${selectedPatient.name}${selectedPatient.village ? ` — ${selectedPatient.village}` : ''}`
            : 'Select a registered patient…'}
        </Text>
      </Pressable>

      <View style={styles.row2}>
        <View style={styles.col}>
          <Text style={styles.fieldLabel}>Age (Years)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={age} onChangeText={setAge} />
        </View>
        <View style={styles.col}>
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {(['female', 'male'] as const).map((g) => (
              <Pressable
                key={g}
                style={[styles.genderPill, gender === g && styles.genderPillActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderPillText, gender === g && styles.genderPillTextActive]}>
                  {g === 'female' ? 'Female' : 'Male'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>2. Part A: Risk Factor Assessment</Text>
      <ToggleRow label="Tobacco Use (Smoking, Khaini, Gutkha)" value={smokeTobacco} onChange={setSmokeTobacco} />
      <ToggleRow label="Alcohol Consumption Weekly" value={alcohol} onChange={setAlcohol} />
      <ToggleRow label="Engaged in Physical Activity (>150 mins/week)" value={physicalActivity} onChange={setPhysicalActivity} />
      <ToggleRow label="Family History of Diabetes / High BP / Heart Disease" value={familyHistory} onChange={setFamilyHistory} />

      <Text style={styles.sectionTitle}>3. Physical Measurements & Clinical Checks</Text>
      <View style={styles.row3}>
        <View style={styles.col}>
          <Text style={styles.fieldLabel}>Systolic BP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={bpSystolic} onChangeText={setBpSystolic} />
        </View>
        <View style={styles.col}>
          <Text style={styles.fieldLabel}>Diastolic BP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={bpDiastolic} onChangeText={setBpDiastolic} />
        </View>
        <View style={styles.col}>
          <Text style={styles.fieldLabel}>Blood Sugar</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={bloodSugar} onChangeText={setBloodSugar} />
        </View>
      </View>
      <View style={styles.col}>
        <Text style={styles.fieldLabel}>Waist Circumference (cm)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={waist} onChangeText={setWaist} />
      </View>

      <Text style={[styles.sectionTitle, styles.warnTitle]}>4. Common Cancer Early Warning Symptoms</Text>
      <ToggleRow label="Non-healing white/red patch in mouth" value={oralLesion} onChange={setOralLesion} danger />
      <ToggleRow label="Lump or nipple discharge in breast" value={breastLump} onChange={setBreastLump} danger />
      <ToggleRow label="Bleeding between periods / post-menopause" value={cervicalDischarge} onChange={setCervicalDischarge} danger />

      {error && <Text style={styles.errorText}>{error}</Text>}

      {likelyNeedsReferral ? (
        <Text style={styles.warnBanner}>⚠ Measured values are above screening thresholds</Text>
      ) : (
        <Text style={styles.hintText}>The CBAC score is calculated when the screening is saved.</Text>
      )}

      <Pressable
        style={[styles.submitBtn, saving && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={saving}
      >
        <Text style={styles.submitBtnText}>{saving ? 'Saving…' : 'Submit CBAC Screening Record'}</Text>
      </Pressable>

      <Modal visible={pickerOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Citizen</Text>
            <ScrollView style={styles.pickerList}>
              {patients.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.pickerRow}
                  onPress={() => {
                    setPatientId(p.id);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={styles.pickerRowName}>{p.name}</Text>
                  <Text style={styles.pickerRowMeta}>
                    {p.village ? `${p.village} · ` : ''}
                    {p.age ? `${p.age} yrs` : ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setPickerOpen(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  danger,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#D1D5DB', true: danger ? '#DC2626' : '#15803D' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6', padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase', marginTop: 18, marginBottom: 10 },
  warnTitle: { color: '#B91C1C' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, backgroundColor: '#fff' },
  pickerBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff' },
  pickerBtnText: { fontSize: 13, color: '#111827', fontWeight: '600' },
  pickerBtnPlaceholder: { fontSize: 13, color: '#9CA3AF' },
  row2: { flexDirection: 'row', gap: 12, marginTop: 14 },
  row3: { flexDirection: 'row', gap: 10 },
  col: { flex: 1, marginBottom: 12 },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderPill: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  genderPillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  genderPillText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  genderPillTextActive: { color: '#fff' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  toggleLabel: { fontSize: 12, color: '#374151', flex: 1, marginRight: 10 },
  errorText: { fontSize: 12, color: '#B91C1C', marginTop: 10 },
  warnBanner: { fontSize: 12, fontWeight: '700', color: '#92400E', backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, padding: 10, marginTop: 14 },
  hintText: { fontSize: 11, color: '#9CA3AF', marginTop: 14 },
  submitBtn: { backgroundColor: '#15803D', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16, marginBottom: 32 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  btnDisabled: { opacity: 0.6 },
  resultWrap: { padding: 20, alignItems: 'center' },
  resultIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  resultIconText: { fontSize: 30, color: '#047857', fontWeight: '800' },
  resultTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 14 },
  resultSubtitle: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6, maxWidth: 320 },
  resultBadges: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  scoreBox: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  scoreLabel: { fontSize: 9, fontWeight: '800', color: '#6B7280' },
  scoreValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  riskBadge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' },
  riskHigh: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  riskModerate: { backgroundColor: '#FEF3C7', color: '#92400E' },
  riskLow: { backgroundColor: '#D1FAE5', color: '#065F46' },
  flagsRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  flagBadge: { fontSize: 11, fontWeight: '700', color: '#92400E', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  recsBox: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginTop: 16, alignSelf: 'stretch' },
  recsTitle: { fontSize: 12, fontWeight: '800', color: '#111827', marginBottom: 6 },
  recItem: { fontSize: 12, color: '#4B5563', marginBottom: 4, lineHeight: 17 },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 16, maxWidth: 320 },
  primaryBtn: { backgroundColor: '#15803D', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20, marginBottom: 20 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  pickerList: { maxHeight: 360 },
  pickerRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerRowName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  pickerRowMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
});
