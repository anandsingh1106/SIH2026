import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import type { Patient, Vaccination } from '@arogyasetu/shared/types';
import type { PatientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PatientStackParamList, 'Vaccinations'>;

interface VaccinationRecord {
  id: string;
  vaccineName: string;
  dose: string;
  dueDate: string;
  givenDate?: string;
  status: 'completed' | 'upcoming' | 'overdue';
  batchNumber?: string;
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toRecord(v: Vaccination): VaccinationRecord {
  return {
    id: v.id,
    vaccineName: v.name,
    dose: v.dose ?? '—',
    dueDate: formatDate(v.scheduledDate),
    givenDate: v.administeredDate ? formatDate(v.administeredDate) : undefined,
    status: v.status === 'GIVEN' ? 'completed' : v.status === 'OVERDUE' ? 'overdue' : 'upcoming',
    batchNumber: v.batchNumber,
  };
}

/**
 * Mirrors frontend/src/pages/patient/Vaccinations.tsx. Drops the web
 * version's hardcoded "Upcoming Schedule: 1" stat and fixed fake ABHA
 * header string — the real patient.abhaId is used instead — and drops the
 * non-functional "Save PDF to Device" certificate button (neither platform
 * has a certificate file to save). The certificate view itself stays a
 * visual mock as on web, since no real digital-signature verification
 * service is wired up on either side.
 */
export function VaccinationsScreen({ navigation }: Props) {
  const [vaccines, setVaccines] = useState<VaccinationRecord[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedVaccine, setSelectedVaccine] = useState<VaccinationRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([dataService.getVaccinations(), dataService.getPatients()])
      .then(([rows, patients]) => {
        if (cancelled) return;
        setVaccines(rows.map(toRecord));
        setPatient(patients[0] ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const completedCount = vaccines.filter((v) => v.status === 'completed').length;
  const overdueCount = vaccines.filter((v) => v.status === 'overdue').length;

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statTeal]}>
            <Text style={styles.statLabelTeal}>Completed</Text>
            <Text style={styles.statValueTeal}>{completedCount}</Text>
            <Text style={styles.statHintTeal}>Verified with U-WIN</Text>
          </View>
          <View style={[styles.statCard, styles.statRose]}>
            <Text style={styles.statLabelRose}>Overdue</Text>
            <Text style={styles.statValueRose}>{overdueCount}</Text>
            <Text style={styles.statHintRose}>Needs attention</Text>
          </View>
        </View>

        <View style={styles.listCard}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>Vaccination History & Forecast</Text>
            {patient?.abhaId ? <Text style={styles.listHeaderMeta}>ABHA: {patient.abhaId}</Text> : null}
          </View>

          {loading && <Text style={styles.emptyText}>Loading your immunisation record…</Text>}
          {!loading && vaccines.length === 0 && <Text style={styles.emptyText}>No vaccination records yet.</Text>}

          {vaccines.map((vac) => (
            <View key={vac.id} style={styles.vacRow}>
              <View style={styles.vacTop}>
                <Text style={styles.vacName}>{vac.vaccineName}</Text>
                <Text
                  style={[
                    styles.vacBadge,
                    vac.status === 'completed'
                      ? styles.badgeCompleted
                      : vac.status === 'overdue'
                      ? styles.badgeOverdue
                      : styles.badgeUpcoming,
                  ]}
                >
                  {vac.status === 'completed' ? 'Completed' : vac.status === 'overdue' ? 'Overdue' : 'Upcoming'}
                </Text>
              </View>
              <Text style={styles.vacDose}>Dose: {vac.dose}</Text>
              <Text style={styles.vacMeta}>
                {vac.givenDate ? `Administered: ${vac.givenDate}` : `Due by: ${vac.dueDate}`}
                {vac.batchNumber ? ` · Batch: ${vac.batchNumber}` : ''}
              </Text>

              {vac.status === 'completed' ? (
                <Pressable
                  style={styles.certBtn}
                  onPress={() => {
                    setSelectedVaccine(vac);
                    setShowCertificateModal(true);
                  }}
                >
                  <Text style={styles.certBtnText}>View Certificate</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.bookBtn} onPress={() => navigation.navigate('Appointments')}>
                  <Text style={styles.bookBtnText}>Book Slot at PHC</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={showCertificateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedVaccine && (
              <>
                <Text style={styles.certTag}>✓ VERIFIED DIGITAL IMMUNIZATION CREDENTIAL</Text>
                <Text style={styles.certVaccineName}>{selectedVaccine.vaccineName}</Text>
                <Text style={styles.certBeneficiary}>
                  Beneficiary: {patient?.name ?? '—'}
                  {patient?.abhaId ? ` | ABHA: ${patient.abhaId}` : ''}
                </Text>

                <View style={styles.certGrid}>
                  <View style={styles.certField}>
                    <Text style={styles.certFieldLabel}>Date of Dose</Text>
                    <Text style={styles.certFieldValue}>{selectedVaccine.givenDate || selectedVaccine.dueDate}</Text>
                  </View>
                  <View style={styles.certField}>
                    <Text style={styles.certFieldLabel}>Batch Ref</Text>
                    <Text style={styles.certFieldValue}>{selectedVaccine.batchNumber || '—'}</Text>
                  </View>
                </View>

                <View style={styles.qrBox}>
                  <Text style={styles.qrText}>[QR VERIFIED]</Text>
                </View>
                <Text style={styles.qrHint}>Scan to verify cryptographic signature on National Health Gateway</Text>

                <Pressable style={styles.closeBtn} onPress={() => setShowCertificateModal(false)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  scroll: { flex: 1, padding: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1 },
  statTeal: { backgroundColor: '#F0FDFA', borderColor: '#99F6E4' },
  statLabelTeal: { fontSize: 10, fontWeight: '800', color: '#0F766E', textTransform: 'uppercase' },
  statValueTeal: { fontSize: 24, fontWeight: '800', color: '#134E4A', marginTop: 6 },
  statHintTeal: { fontSize: 10, color: '#0D9488', marginTop: 4 },
  statRose: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' },
  statLabelRose: { fontSize: 10, fontWeight: '800', color: '#9F1239', textTransform: 'uppercase' },
  statValueRose: { fontSize: 24, fontWeight: '800', color: '#881337', marginTop: 6 },
  statHintRose: { fontSize: 10, color: '#E11D48', marginTop: 4 },
  listCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, overflow: 'hidden' },
  listHeader: { backgroundColor: '#F9FAFB', padding: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listHeaderTitle: { fontSize: 13, fontWeight: '800', color: '#111827' },
  listHeaderMeta: { fontSize: 10, color: '#6B7280' },
  emptyText: { textAlign: 'center', padding: 24, color: '#9CA3AF', fontSize: 12 },
  vacRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  vacTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vacName: { fontSize: 13, fontWeight: '800', color: '#111827', flex: 1 },
  vacBadge: { fontSize: 9, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeCompleted: { backgroundColor: '#D1FAE5', color: '#065F46' },
  badgeUpcoming: { backgroundColor: '#FEF3C7', color: '#92400E' },
  badgeOverdue: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  vacDose: { fontSize: 11, color: '#4B5563', marginTop: 4 },
  vacMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  certBtn: { alignSelf: 'flex-start', backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#99F6E4', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  certBtnText: { fontSize: 11, fontWeight: '700', color: '#0F766E' },
  bookBtn: { alignSelf: 'flex-start', backgroundColor: '#15803D', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  bookBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, alignItems: 'center' },
  certTag: { fontSize: 10, fontWeight: '800', color: '#0F766E', backgroundColor: '#F0FDFA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginBottom: 12, textAlign: 'center' },
  certVaccineName: { fontSize: 17, fontWeight: '800', color: '#111827' },
  certBeneficiary: { fontSize: 11, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  certGrid: { flexDirection: 'row', gap: 12, marginTop: 14, alignSelf: 'stretch' },
  certField: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  certFieldLabel: { fontSize: 9, color: '#9CA3AF' },
  certFieldValue: { fontSize: 12, fontWeight: '700', color: '#111827', marginTop: 2 },
  qrBox: { width: 110, height: 110, backgroundColor: '#1C1917', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 18, borderWidth: 1, borderColor: '#0D9488' },
  qrText: { color: '#5EEAD4', fontSize: 10, fontWeight: '800', fontFamily: 'monospace' },
  qrHint: { fontSize: 9, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  closeBtn: { backgroundColor: '#15803D', borderRadius: 10, paddingHorizontal: 30, paddingVertical: 12, marginTop: 18, marginBottom: 8 },
  closeBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
