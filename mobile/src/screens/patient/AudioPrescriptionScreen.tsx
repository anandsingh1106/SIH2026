import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import { useAuth } from '../../services/auth/authContext';
import { AudioPrescriptionPlayer } from '../../components/AudioPrescriptionPlayer';
import type { Prescription } from '@arogyasetu/shared/types';
import type { PatientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PatientStackParamList, 'AudioPrescription'>;

/** Mirrors frontend/src/pages/patient/AudioPrescription.tsx. */
export function AudioPrescriptionScreen(_props: Props) {
  const { currentUser } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPrescriptions(await dataService.getPrescriptions());
    } catch {
      setError('Could not reach the prescription service. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPrescriptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prescriptions;
    return prescriptions.filter(
      (pres) =>
        (pres.doctorName ?? '').toLowerCase().includes(q) ||
        (pres.facilityName ?? '').toLowerCase().includes(q) ||
        (pres.date ?? '').toLowerCase().includes(q) ||
        (pres.medicines ?? []).some((m) => (m.name ?? '').toLowerCase().includes(q))
    );
  }, [prescriptions, query]);

  const totalMedicines = useMemo(
    () => prescriptions.reduce((sum, pres) => sum + (pres.medicines?.length ?? 0), 0),
    [prescriptions]
  );

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.headerSubtitle}>Listen to your medicine instructions in Marathi, Hindi, or English</Text>
        <Pressable style={styles.refreshBtn} onPress={loadData} disabled={isLoading}>
          <Text style={styles.refreshBtnText}>{isLoading ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <View style={styles.noticeBox}>
        <Text style={styles.noticeTitle}>Accessibility Feature</Text>
        <Text style={styles.noticeText}>
          This feature reads out your prescription in simple language. It is designed to help
          patients who have difficulty reading. Always follow your doctor's verbal instructions.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Prescriptions</Text>
              <Text style={styles.statValue}>{isLoading ? '—' : prescriptions.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Medicines</Text>
              <Text style={styles.statValue}>{isLoading ? '—' : totalMedicines}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Most Recent</Text>
              <Text style={styles.statValueSmall}>{isLoading ? '—' : prescriptions[0]?.date ?? '—'}</Text>
            </View>
          </View>

          {!isLoading && prescriptions.length > 0 && (
            <TextInput
              style={styles.search}
              placeholder="Search by doctor, facility, date, or medicine…"
              value={query}
              onChangeText={setQuery}
            />
          )}

          {isLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#15803D" />
            </View>
          )}

          {!isLoading && prescriptions.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No prescriptions yet</Text>
              <Text style={styles.emptyHint}>
                Once your doctor issues an e-prescription, you'll be able to listen to it here in
                your preferred language.
              </Text>
            </View>
          )}

          {!isLoading && prescriptions.length > 0 && filteredPrescriptions.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No matching prescriptions</Text>
              <Text style={styles.emptyHint}>Nothing matches "{query}". Try a different search.</Text>
              <Pressable style={styles.retryBtn} onPress={() => setQuery('')}>
                <Text style={styles.retryBtnText}>Clear search</Text>
              </Pressable>
            </View>
          )}

          {!isLoading &&
            filteredPrescriptions.map((pres) => (
              <View key={pres.id} style={styles.rxCard}>
                <View style={styles.rxHeader}>
                  <Text style={styles.rxTitle}>Prescription — {pres.date}</Text>
                  <Text style={styles.rxSubtitle}>{pres.doctorName} · {pres.facilityName}</Text>
                </View>
                <View style={styles.rxBody}>
                  <AudioPrescriptionPlayer
                    patientName={currentUser?.name || 'Patient'}
                    doctorName={pres.doctorName}
                    facilityName={pres.facilityName}
                    date={pres.date}
                    medicines={pres.medicines}
                    generalAdvice={pres.generalAdvice}
                    generalAdviceMr={pres.generalAdviceMr}
                    generalAdviceHi={pres.generalAdviceHi}
                  />
                </View>
              </View>
            ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerSubtitle: { fontSize: 12, color: '#6B7280', flex: 1, marginRight: 10 },
  refreshBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  refreshBtnText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  noticeBox: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, padding: 14, marginBottom: 16 },
  noticeTitle: { fontSize: 12, fontWeight: '800', color: '#1E3A8A' },
  noticeText: { fontSize: 11, color: '#1D4ED8', marginTop: 4, lineHeight: 16 },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, padding: 16, alignItems: 'center' },
  errorText: { fontSize: 12, color: '#991B1B', textAlign: 'center', marginBottom: 10 },
  retryBtn: { backgroundColor: '#DC2626', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  retryBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12 },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 4 },
  statValueSmall: { fontSize: 12, fontWeight: '800', color: '#111827', marginTop: 6 },
  search: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, backgroundColor: '#fff', marginBottom: 14 },
  loadingRow: { paddingVertical: 30, alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#4B5563' },
  emptyHint: { fontSize: 12, color: '#9CA3AF', marginTop: 6, textAlign: 'center', marginBottom: 12 },
  rxCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  rxHeader: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  rxTitle: { fontSize: 13, fontWeight: '800', color: '#111827' },
  rxSubtitle: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  rxBody: { padding: 14 },
});
