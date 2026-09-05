import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput, Linking, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { backendApi, MaternalRecord } from '@arogyasetu/shared/services/api';
import { dataService } from '../../services/api/dataService';
import type { Patient } from '@arogyasetu/shared/types';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'MaternalCare'>;

function gestationalWeeks(lmpDate?: string): number | null {
  if (!lmpDate) return null;
  const lmp = new Date(lmpDate);
  if (Number.isNaN(lmp.getTime())) return null;
  const days = Math.floor((Date.now() - lmp.getTime()) / 86400000);
  return Math.max(0, Math.floor(days / 7));
}

/**
 * Mirrors frontend/src/pages/asha/MaternalCare.tsx, but against the real
 * /api/maternal-records + /api/maternal-records/:id/anc-visits endpoints
 * (already fully implemented in ashaService.js/ashaController.js — EDD is
 * derived server-side from LMP, high-risk auto-flags on severe anaemia —
 * just not consumed by any UI yet) instead of the web version's client-only
 * useState([...3 fictional mothers]). Drops the hardcoded Hb/BP/risk-factor
 * values the web version showed for its 3 seeded mothers; here Hb/BP show
 * only once an ANC visit has actually recorded them.
 */
export function MaternalCareScreen(_props: Props) {
  const [records, setRecords] = useState<MaternalRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regPatientId, setRegPatientId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [regLmp, setRegLmp] = useState('');
  const [regGravida, setRegGravida] = useState('1');
  const [regParity, setRegParity] = useState('0');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [visitModalFor, setVisitModalFor] = useState<MaternalRecord | null>(null);
  const [visitDate, setVisitDate] = useState('');
  const [visitBp, setVisitBp] = useState('');
  const [visitHb, setVisitHb] = useState('');
  const [visitWeight, setVisitWeight] = useState('');
  const [isSavingVisit, setIsSavingVisit] = useState(false);
  const [visitError, setVisitError] = useState('');

  const byPatient = new Map(patients.map((p) => [p.id, p]));

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [{ items }, patientRows] = await Promise.all([
        backendApi.getMaternalRecords({ limit: 100 }),
        dataService.getPatients(),
      ]);
      setRecords(items);
      setPatients(patientRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load maternal records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRegister = async () => {
    if (!regPatientId) {
      setSaveError('Select the mother being registered.');
      return;
    }
    setIsSaving(true);
    setSaveError('');
    try {
      await backendApi.createMaternalRecord({
        patientId: regPatientId,
        lmpDate: regLmp || undefined,
        gravida: Number(regGravida) || undefined,
        parity: Number(regParity) || undefined,
      });
      setIsRegisterOpen(false);
      setRegPatientId('');
      setRegLmp('');
      setRegGravida('1');
      setRegParity('0');
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not register this pregnancy.');
    } finally {
      setIsSaving(false);
    }
  };

  const openVisitModal = (record: MaternalRecord) => {
    setVisitModalFor(record);
    setVisitDate(new Date().toISOString().slice(0, 10));
    setVisitBp('');
    setVisitHb('');
    setVisitWeight('');
    setVisitError('');
  };

  const handleRecordVisit = async () => {
    if (!visitModalFor) return;
    setIsSavingVisit(true);
    setVisitError('');
    try {
      const [systolic, diastolic] = visitBp.split('/').map((v) => Number(v.trim()));
      await backendApi.addAncVisit(visitModalFor.id, {
        visitDate,
        bloodPressureSystolic: Number.isFinite(systolic) ? systolic : undefined,
        bloodPressureDiastolic: Number.isFinite(diastolic) ? diastolic : undefined,
        hemoglobin: visitHb ? Number(visitHb) : undefined,
        weight: visitWeight ? Number(visitWeight) : undefined,
      });
      setVisitModalFor(null);
      await load();
    } catch (err) {
      setVisitError(err instanceof Error ? err.message : 'Could not save this ANC visit.');
    } finally {
      setIsSavingVisit(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.headerSubtitle}>ANC tracking, EDD, and high-risk pregnancy monitoring</Text>
        <Pressable style={styles.registerBtn} onPress={() => setIsRegisterOpen(true)}>
          <Text style={styles.registerBtnText}>+ Register</Text>
        </Pressable>
      </View>

      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#DC2626" />
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!isLoading && !error && (
        <ScrollView style={styles.list}>
          {records.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No pregnancies registered yet</Text>
              <Text style={styles.emptyHint}>Register a mother to start tracking her ANC schedule.</Text>
            </View>
          ) : (
            records.map((m) => {
              const patient = byPatient.get(m.patientId);
              const weeks = gestationalWeeks(m.lmpDate);
              return (
                <View key={m.id} style={[styles.card, m.highRisk && styles.cardHighRisk]}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.riskBadge, m.highRisk ? styles.riskBadgeHigh : styles.riskBadgeNormal]}>
                      {m.highRisk ? 'HIGH RISK' : 'NORMAL'}
                    </Text>
                    <Text style={styles.motherName}>{m.patientName ?? patient?.name ?? 'Unknown'}</Text>
                    <Text style={styles.motherMeta}>
                      Gravida {m.gravida ?? '—'}, Para {m.parity ?? '—'}
                    </Text>
                  </View>

                  <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Gestation</Text>
                      <Text style={styles.metricValue}>{weeks !== null ? `${weeks} wks` : '—'}</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>EDD</Text>
                      <Text style={styles.metricValue}>{m.eddDate ?? '—'}</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Outcome</Text>
                      <Text style={styles.metricValue}>{m.outcome ?? 'ONGOING'}</Text>
                    </View>
                  </View>

                  {m.riskFactors.length > 0 && (
                    <View style={styles.riskFactorsBox}>
                      <Text style={styles.riskFactorsLabel}>⚠ High-Risk Indicators</Text>
                      {m.riskFactors.map((rf, i) => (
                        <Text key={i} style={styles.riskFactorItem}>• {rf}</Text>
                      ))}
                    </View>
                  )}

                  <View style={styles.actionsRow}>
                    <Pressable style={styles.visitBtn} onPress={() => openVisitModal(m)}>
                      <Text style={styles.visitBtnText}>Record ANC Visit</Text>
                    </Pressable>
                    {patient?.phone && (
                      <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${patient.phone}`)}>
                        <Text style={styles.callBtnText}>Call</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={isRegisterOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register New Pregnant Mother</Text>
            <Text style={styles.modalSubtitle}>EDD is calculated automatically from the LMP date.</Text>

            <Text style={styles.fieldLabel}>Mother *</Text>
            <Pressable style={styles.pickerBtn} onPress={() => setPickerOpen(true)}>
              <Text style={regPatientId ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                {patients.find((p) => p.id === regPatientId)?.name ?? 'Select a registered patient…'}
              </Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Last Menstrual Period (LMP)</Text>
            <TextInput style={styles.input} value={regLmp} onChangeText={setRegLmp} placeholder="YYYY-MM-DD" />

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Gravida</Text>
                <TextInput style={styles.input} value={regGravida} onChangeText={setRegGravida} keyboardType="number-pad" />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Para</Text>
                <TextInput style={styles.input} value={regParity} onChangeText={setRegParity} keyboardType="number-pad" />
              </View>
            </View>

            {saveError ? <Text style={styles.saveErrorText}>{saveError}</Text> : null}

            <Pressable style={[styles.submitBtn, isSaving && styles.btnDisabled]} onPress={handleRegister} disabled={isSaving}>
              <Text style={styles.submitBtnText}>{isSaving ? 'Registering…' : 'Register & Calculate EDD'}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setIsRegisterOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={pickerOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Mother</Text>
            <ScrollView style={styles.pickerList}>
              {patients.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.pickerRow}
                  onPress={() => {
                    setRegPatientId(p.id);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={styles.pickerRowName}>{p.name}</Text>
                  <Text style={styles.pickerRowMeta}>{p.village ? `${p.village} · ` : ''}{p.age ? `${p.age} yrs` : ''}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setPickerOpen(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!visitModalFor} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Record ANC Visit — {visitModalFor?.patientName ?? byPatient.get(visitModalFor?.patientId ?? '')?.name}
            </Text>

            <Text style={styles.fieldLabel}>Visit Date</Text>
            <TextInput style={styles.input} value={visitDate} onChangeText={setVisitDate} placeholder="YYYY-MM-DD" />

            <Text style={styles.fieldLabel}>Blood Pressure (e.g. 120/80)</Text>
            <TextInput style={styles.input} value={visitBp} onChangeText={setVisitBp} placeholder="120/80" />

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Hemoglobin (g/dL)</Text>
                <TextInput style={styles.input} value={visitHb} onChangeText={setVisitHb} keyboardType="decimal-pad" />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Weight (kg)</Text>
                <TextInput style={styles.input} value={visitWeight} onChangeText={setVisitWeight} keyboardType="decimal-pad" />
              </View>
            </View>

            {visitError ? <Text style={styles.saveErrorText}>{visitError}</Text> : null}

            <Pressable style={[styles.submitBtn, isSavingVisit && styles.btnDisabled]} onPress={handleRecordVisit} disabled={isSavingVisit}>
              <Text style={styles.submitBtnText}>{isSavingVisit ? 'Saving…' : 'Save ANC Visit'}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setVisitModalFor(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  headerSubtitle: { fontSize: 12, color: '#6B7280', flex: 1, marginRight: 10 },
  registerBtn: { backgroundColor: '#DC2626', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  registerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  loadingRow: { paddingVertical: 40, alignItems: 'center' },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 14, marginHorizontal: 16 },
  errorText: { fontSize: 12, color: '#991B1B' },
  list: { flex: 1, paddingHorizontal: 16 },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#4B5563' },
  emptyHint: { fontSize: 12, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginBottom: 12 },
  cardHighRisk: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  cardTop: { marginBottom: 10 },
  riskBadge: { alignSelf: 'flex-start', fontSize: 9, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  riskBadgeHigh: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  riskBadgeNormal: { backgroundColor: '#D1FAE5', color: '#065F46' },
  motherName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  motherMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  metricsRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, gap: 10 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 9, color: '#9CA3AF' },
  metricValue: { fontSize: 12, fontWeight: '800', color: '#134E4A', marginTop: 2 },
  riskFactorsBox: { marginTop: 10 },
  riskFactorsLabel: { fontSize: 10, fontWeight: '800', color: '#B91C1C', marginBottom: 4 },
  riskFactorItem: { fontSize: 11, color: '#991B1B', marginBottom: 2 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  visitBtn: { flex: 1, backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  visitBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  callBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9 },
  callBtnText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  modalSubtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 4, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  pickerBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  pickerBtnText: { fontSize: 13, color: '#111827', fontWeight: '600' },
  pickerBtnPlaceholder: { fontSize: 13, color: '#9CA3AF' },
  pickerList: { maxHeight: 340 },
  pickerRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerRowName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  pickerRowMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  row2: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  saveErrorText: { fontSize: 12, color: '#B91C1C', marginTop: 10 },
  submitBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
});
