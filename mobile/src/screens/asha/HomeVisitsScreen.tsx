import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import type { Patient, HomeVisit, Vitals, Referral } from '@arogyasetu/shared/types';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'HomeVisits'>;

const DANGER_SIGNS = [
  'Severe Pallor (Hb < 8 g/dL)',
  'Elevated BP (>= 140/90 mmHg)',
  'Severe Headache / Blurred Vision',
  'Pedal Edema (Swelling in feet)',
  'High Fever with Chills',
  'Vaginal Bleeding / Spotting',
  'Reduced Fetal Movements',
  'Breathlessness at Rest',
];

/** Mirrors frontend/src/pages/asha/HomeVisits.tsx's recording flow and referral trigger exactly. */
export function HomeVisitsScreen({ navigation }: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [vitals, setVitals] = useState<Vitals>({ bpSystolic: 138, bpDiastolic: 88, pulse: 90, spo2: 97, temperature: 98.6 });
  const [observations, setObservations] = useState('');
  const [selectedDangerSigns, setSelectedDangerSigns] = useState<string[]>([]);
  const [createReferral, setCreateReferral] = useState(true);
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [receipt, setReceipt] = useState<{ token: string; queued: boolean; patient: string; date: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  useEffect(() => {
    dataService.getPatients().then((list) => {
      setPatients(list);
      if (list[0]) setSelectedPatientId(list[0].id);
      setIsLoadingPatients(false);
    });
  }, []);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const toggleDangerSign = (sign: string) => {
    setSelectedDangerSigns((prev) => (prev.includes(sign) ? prev.filter((s) => s !== sign) : [...prev, sign]));
  };

  const handleRecordVisit = async () => {
    if (!selectedPatient) {
      setSaveError('Select a patient before saving the visit.');
      return;
    }
    setSaveError('');
    setIsSaving(true);

    const newVisit: HomeVisit = {
      id: 'visit-' + Date.now(),
      ashaId: 'usr-asha-1',
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      date: new Date().toISOString().slice(0, 10),
      vitals,
      observations: observations || 'Conducted standard maternal & vital monitoring.',
      dangerSignsIdentified: selectedDangerSigns,
      screeningOutcome: selectedDangerSigns.length > 0 ? 'High Risk Identified' : 'Normal',
      referralRecommended: createReferral,
      notes: observations,
      nextVisitDate,
      syncStatus: 'pending',
    };

    let result: Awaited<ReturnType<typeof dataService.recordHomeVisit>>;
    try {
      result = await dataService.recordHomeVisit(newVisit);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not record the visit.');
      setIsSaving(false);
      return;
    }

    if (createReferral) {
      const ref: Referral = {
        id: 'ref-' + Date.now(),
        referralCode: 'REF-MH-PUN-' + Math.floor(1000 + Math.random() * 9000),
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientAge: selectedPatient.age,
        patientGender: selectedPatient.gender,
        referringFacilityId: 'fac-phc-paud',
        referringFacilityName: 'PHC Paud Subcenter',
        referringDoctorName: 'Sunita Gaikwad (ASHA) / Dr. Deshmukh',
        targetFacilityId: 'fac-gmc-sassoon',
        targetFacilityName: 'B.J. Govt Medical College & Sassoon General Hospital',
        specialty: 'Obstetrics & High-Risk Pregnancy',
        priority: selectedDangerSigns.length > 0 ? 'critical' : 'moderate',
        status: 'created',
        provisionalDiagnosis: 'High-Risk Maternal Symptoms identified during home visit',
        clinicalSummary: `Identified danger signs: ${selectedDangerSigns.join(', ')}. Systolic BP: ${vitals.bpSystolic} mmHg. Immediate hospital review advised.`,
        aiPriorityScore: 92,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [
          { status: 'created', timestamp: new Date().toISOString(), note: 'Referral generated from ASHA home visit', updatedBy: 'Sunita Gaikwad' },
        ],
      };
      await dataService.createReferral(ref).catch(() => undefined);
    }

    setReceipt({ token: result.token, queued: result.queued, patient: selectedPatient.name, date: newVisit.date });
    setIsSaving(false);
  };

  const setVital = (key: keyof Vitals, value: string) =>
    setVitals({ ...vitals, [key]: value ? parseFloat(value) : undefined });

  return (
    <ScrollView style={styles.screen}>
      {saveError ? <Text style={styles.errorBanner}>{saveError}</Text> : null}

      {!isLoadingPatients && patients.length === 0 && (
        <Text style={styles.errorBanner}>
          No patients loaded on this device yet. Connect to the internet at least once to bring your
          patient list down before working offline.
        </Text>
      )}

      {receipt && (
        <View style={[styles.receiptBanner, receipt.queued ? styles.receiptBannerQueued : styles.receiptBannerSynced]}>
          <Text style={styles.receiptTitle}>{receipt.queued ? 'Visit saved offline' : 'Visit recorded'}</Text>
          <Text style={styles.receiptBody}>
            {receipt.patient} · {receipt.date}
            {receipt.queued
              ? ' — queued on this device and will sync automatically when you are back online.'
              : ' — saved to the health record.'}
          </Text>
          <View style={styles.tokenRow}>
            <View>
              <Text style={styles.tokenLabel}>VISIT TOKEN</Text>
              <Text style={styles.tokenValue}>{receipt.token}</Text>
            </View>
            <View style={styles.tokenActions}>
              <Pressable
                style={styles.tokenButton}
                onPress={async () => {
                  await Clipboard.setStringAsync(receipt.token);
                  Alert.alert('Copied', 'Visit token copied to clipboard.');
                }}
              >
                <Text style={styles.tokenButtonText}>Copy</Text>
              </Pressable>
              <Pressable style={styles.tokenButton} onPress={() => navigation.navigate('VisitLog')}>
                <Text style={styles.tokenButtonText}>View Log</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <Text style={styles.label}>Select Patient</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patientRow}>
        {patients.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.patientChip, selectedPatientId === p.id && styles.patientChipActive]}
            onPress={() => setSelectedPatientId(p.id)}
          >
            <Text style={[styles.patientChipText, selectedPatientId === p.id && styles.patientChipTextActive]}>
              {p.name} ({p.village})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {selectedPatient && (
        <View style={styles.patientSummary}>
          <Text style={styles.patientSummaryName}>{selectedPatient.name}</Text>
          <Text style={styles.patientSummaryMeta}>
            {selectedPatient.age} yrs · {selectedPatient.gender} · {selectedPatient.village}
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>1. Record Measured Vital Signs</Text>
      <View style={styles.vitalsGrid}>
        <View style={styles.vitalField}>
          <Text style={styles.label}>BP Systolic</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={String(vitals.bpSystolic ?? '')} onChangeText={(v) => setVital('bpSystolic', v)} />
        </View>
        <View style={styles.vitalField}>
          <Text style={styles.label}>BP Diastolic</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={String(vitals.bpDiastolic ?? '')} onChangeText={(v) => setVital('bpDiastolic', v)} />
        </View>
        <View style={styles.vitalField}>
          <Text style={styles.label}>Pulse</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={String(vitals.pulse ?? '')} onChangeText={(v) => setVital('pulse', v)} />
        </View>
        <View style={styles.vitalField}>
          <Text style={styles.label}>SpO2 (%)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={String(vitals.spo2 ?? '')} onChangeText={(v) => setVital('spo2', v)} />
        </View>
        <View style={styles.vitalField}>
          <Text style={styles.label}>Temperature (°F)</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={String(vitals.temperature ?? '')} onChangeText={(v) => setVital('temperature', v)} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>2. Red-Flag Danger Signs Checklist</Text>
      <View style={styles.dangerGrid}>
        {DANGER_SIGNS.map((sign) => {
          const checked = selectedDangerSigns.includes(sign);
          return (
            <Pressable key={sign} style={[styles.dangerChip, checked && styles.dangerChipActive]} onPress={() => toggleDangerSign(sign)}>
              <Text style={[styles.dangerChipText, checked && styles.dangerChipTextActive]}>{sign}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>3. Field Observations & Nutrition Guidance</Text>
      <TextInput
        style={styles.textarea}
        multiline
        numberOfLines={4}
        value={observations}
        onChangeText={setObservations}
        placeholder="e.g. Counseled on taking 2 IFA tablets daily with lemon water."
      />

      <Pressable style={styles.referralToggle} onPress={() => setCreateReferral(!createReferral)}>
        <View style={[styles.checkbox, createReferral && styles.checkboxChecked]}>
          {createReferral ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <View style={styles.referralToggleText}>
          <Text style={styles.referralToggleTitle}>Trigger Tele-Referral to Hospital</Text>
          <Text style={styles.referralToggleSubtitle}>Auto-routes to Doctor Queue & reserves tertiary bed</Text>
        </View>
      </Pressable>

      <Text style={styles.label}>Scheduled Next Follow-up Visit (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={nextVisitDate} onChangeText={setNextVisitDate} placeholder="2026-09-15" />

      <Pressable
        style={[styles.submitButton, (isSaving || !selectedPatient) && styles.submitButtonDisabled]}
        onPress={handleRecordVisit}
        disabled={isSaving || !selectedPatient}
      >
        <Text style={styles.submitButtonText}>{isSaving ? 'Saving…' : 'Save Home Visit Offline'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6', padding: 16 },
  errorBanner: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, padding: 12, color: '#B91C1C', fontSize: 12, marginBottom: 12 },
  receiptBanner: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  receiptBannerQueued: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  receiptBannerSynced: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  receiptTitle: { fontSize: 13, fontWeight: '800', color: '#111827' },
  receiptBody: { fontSize: 12, color: '#4B5563', marginTop: 4, marginBottom: 10 },
  tokenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  tokenLabel: { fontSize: 9, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' },
  tokenValue: { fontSize: 16, fontWeight: '800', color: '#111827', fontFamily: 'monospace' },
  tokenActions: { flexDirection: 'row', gap: 6 },
  tokenButton: { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  tokenButtonText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  patientRow: { marginBottom: 10 },
  patientChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 },
  patientChipActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  patientChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  patientChipTextActive: { color: '#fff' },
  patientSummary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 16 },
  patientSummaryName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  patientSummaryMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#111827', textTransform: 'uppercase', marginTop: 16, marginBottom: 10 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vitalField: { width: '47%' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  dangerGrid: { gap: 8 },
  dangerChip: { padding: 12, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  dangerChipActive: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  dangerChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  dangerChipTextActive: { color: '#7F1D1D' },
  textarea: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12, fontSize: 13, textAlignVertical: 'top', minHeight: 90 },
  referralToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 14, marginTop: 16 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#D97706', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#D97706' },
  checkboxMark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  referralToggleText: { flex: 1 },
  referralToggleTitle: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  referralToggleSubtitle: { fontSize: 11, color: '#B45309', marginTop: 2 },
  submitButton: { backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 24 },
  submitButtonDisabled: { backgroundColor: '#9CA3AF' },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
