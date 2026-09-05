import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import type { Prescription } from '@arogyasetu/shared/types';
import type { PatientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PatientStackParamList, 'Prescriptions'>;

const TIMING_MAP: Record<string, string> = {
  '1-0-0': 'Morning only',
  '0-1-0': 'Afternoon only',
  '0-0-1': 'Night only',
  '1-0-1': 'Morning & Night',
  '1-1-1': 'Three times daily',
  '1-1-0': 'Morning & Afternoon',
};

/**
 * Mirrors frontend/src/pages/patient/Prescriptions.tsx. Drops Download PDF
 * and Print — there is no PDF-generation endpoint and no printer flow on
 * mobile — keeping the Audio Explanation link, which the app does support.
 */
export function PrescriptionsScreen({ navigation }: Props) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    dataService
      .getPrescriptions()
      .then((rows) => {
        if (cancelled) return;
        setPrescriptions(rows);
        setExpanded(rows[0]?.id ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.noticeBox}>
        <Text style={styles.noticeTitle}>Important Reminder</Text>
        <Text style={styles.noticeText}>
          Take medicines as prescribed. Do not stop or change doses without consulting your doctor.
          If you experience side effects, contact your healthcare provider immediately.
        </Text>
      </View>

      {loading && <Text style={styles.emptyText}>Loading your prescriptions…</Text>}
      {!loading && prescriptions.length === 0 && (
        <Text style={styles.emptyText}>No prescriptions on record yet.</Text>
      )}

      {prescriptions.map((pres) => {
        const isOpen = expanded === pres.id;
        return (
          <View key={pres.id} style={styles.card}>
            <Pressable style={styles.cardHeader} onPress={() => setExpanded(isOpen ? null : pres.id)}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.cardHeaderTop}>
                  <Text style={styles.dateText}>{pres.date}</Text>
                  <Text style={styles.rxBadge}>Rx #{(pres.id ?? '').split('-').pop()}</Text>
                </View>
                <Text style={styles.doctorText}>{pres.doctorName} · {pres.facilityName}</Text>
                <Text style={styles.countText}>{pres.medicines.length} medicines prescribed</Text>
              </View>
              <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
            </Pressable>

            {isOpen && (
              <View style={styles.cardBody}>
                <Text style={styles.sectionLabel}>Medicines</Text>
                {pres.medicines.map((med, idx) => (
                  <View key={idx} style={styles.medBox}>
                    <View style={styles.medTop}>
                      <View style={styles.medTopLeft}>
                        <Text style={styles.medName}>{med.name}</Text>
                        {med.genericName ? <Text style={styles.medGeneric}>{med.genericName}</Text> : null}
                      </View>
                      <Text style={styles.dosageBadge}>{med.dosage}</Text>
                    </View>
                    <View style={styles.medMetaRow}>
                      <View style={styles.medMetaCol}>
                        <Text style={styles.medMetaLabel}>Schedule</Text>
                        <Text style={styles.medMetaValue}>{TIMING_MAP[med.frequency] ?? med.frequency}</Text>
                      </View>
                      <View style={styles.medMetaCol}>
                        <Text style={styles.medMetaLabel}>Duration</Text>
                        <Text style={styles.medMetaValue}>{med.duration}</Text>
                      </View>
                      <View style={styles.medMetaCol}>
                        <Text style={styles.medMetaLabel}>When to Take</Text>
                        <Text style={styles.medMetaValue}>{med.takeWith?.replace('_', ' ')}</Text>
                      </View>
                    </View>
                    {med.instructions ? (
                      <View style={styles.instructionsBox}>
                        <Text style={styles.instructionsText}>{med.instructions}</Text>
                      </View>
                    ) : null}
                    {med.instructionsMr ? <Text style={styles.mrText}>{med.instructionsMr}</Text> : null}
                  </View>
                ))}

                {pres.generalAdvice ? (
                  <View style={styles.adviceBox}>
                    <Text style={styles.adviceLabel}>Doctor's Advice</Text>
                    <Text style={styles.adviceText}>{pres.generalAdvice}</Text>
                  </View>
                ) : null}

                {pres.followUpDate ? (
                  <Text style={styles.followUpText}>
                    Next Review: <Text style={styles.followUpBadge}>{pres.followUpDate}</Text>
                  </Text>
                ) : null}

                {pres.warnings && pres.warnings.length > 0 ? (
                  <View style={styles.warningsBox}>
                    <Text style={styles.warningsLabel}>Warnings</Text>
                    {pres.warnings.map((w, i) => (
                      <Text key={i} style={styles.warningItem}>⚠ {w}</Text>
                    ))}
                  </View>
                ) : null}

                <Pressable style={styles.audioBtn} onPress={() => navigation.navigate('AudioPrescription')}>
                  <Text style={styles.audioBtnText}>🔊 Audio Explanation</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6', padding: 16 },
  noticeBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 14, marginBottom: 16 },
  noticeTitle: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  noticeText: { fontSize: 11, color: '#B45309', marginTop: 4, lineHeight: 16 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 12 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  cardHeaderLeft: { flex: 1 },
  cardHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 13, fontWeight: '800', color: '#111827' },
  rxBadge: { fontSize: 9, fontWeight: '800', color: '#1D4ED8', backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  doctorText: { fontSize: 12, color: '#4B5563', marginTop: 4 },
  countText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  chevron: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
  cardBody: { borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#374151', marginBottom: 10 },
  medBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  medTop: { flexDirection: 'row', justifyContent: 'space-between' },
  medTopLeft: { flex: 1 },
  medName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  medGeneric: { fontSize: 11, color: '#9CA3AF' },
  dosageBadge: { fontSize: 10, fontWeight: '700', color: '#374151', backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  medMetaRow: { flexDirection: 'row', marginTop: 10, gap: 10 },
  medMetaCol: { flex: 1 },
  medMetaLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '600' },
  medMetaValue: { fontSize: 11, fontWeight: '700', color: '#374151', marginTop: 2, textTransform: 'capitalize' },
  instructionsBox: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 8, marginTop: 10 },
  instructionsText: { fontSize: 11, color: '#1D4ED8' },
  mrText: { fontSize: 11, color: '#6B7280', marginTop: 6, fontWeight: '600' },
  adviceBox: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#DCFCE7', marginTop: 4 },
  adviceLabel: { fontSize: 11, fontWeight: '800', color: '#166534', marginBottom: 4 },
  adviceText: { fontSize: 12, color: '#374151' },
  followUpText: { fontSize: 12, color: '#4B5563', marginTop: 10 },
  followUpBadge: { fontWeight: '800', color: '#92400E', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  warningsBox: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA', marginTop: 10 },
  warningsLabel: { fontSize: 11, fontWeight: '800', color: '#B91C1C', marginBottom: 6 },
  warningItem: { fontSize: 11, color: '#DC2626', marginBottom: 4 },
  audioBtn: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  audioBtnText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
});
