import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import type { Referral } from '@arogyasetu/shared/types';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'Referrals'>;

/**
 * Mirrors frontend/src/pages/asha/Referrals.tsx. Web shows list and detail
 * side by side; on a phone's width that becomes a list that expands the
 * selected referral's timeline inline instead of a second column.
 */
export function ReferralsScreen(_props: Props) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    dataService.getReferrals().then((list) => {
      setReferrals(list);
      if (list.length > 0) setSelectedId(list[0].id);
    });

    const unsub = dataService.subscribe(({ entity }) => {
      if (entity === 'referrals') dataService.getReferrals().then(setReferrals);
    });
    return () => unsub();
  }, []);

  const selected = referrals.find((r) => r.id === selectedId) ?? null;

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.sectionTitle}>Referred Village Citizens ({referrals.length})</Text>

      {referrals.map((r) => {
        const isSelected = selectedId === r.id;
        return (
          <Pressable
            key={r.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => setSelectedId(isSelected ? null : r.id)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.referralCode}>{r.referralCode}</Text>
              <Text style={[styles.priorityBadge, r.priority === 'critical' && styles.priorityBadgeCritical]}>
                {r.priority.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.patientName}>{r.patientName}</Text>
            <Text style={styles.diagnosis} numberOfLines={1}>{r.provisionalDiagnosis}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.targetFacility}>To: {(r.targetFacilityName ?? '').split(' ')[0]}</Text>
              <Text style={styles.statusBadge}>{r.status.replace('_', ' ')}</Text>
            </View>

            {isSelected && (
              <View style={styles.detail}>
                <View style={styles.timelineList}>
                  {r.history.map((h, i) => (
                    <View key={i} style={styles.timelineItem}>
                      <View style={[styles.timelineDot, i === r.history.length - 1 && styles.timelineDotCurrent]} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineStatus}>{h.status.replace('_', ' ').toUpperCase()}</Text>
                        <Text style={styles.timelineTimestamp}>{new Date(h.timestamp).toLocaleString('en-IN')}</Text>
                        {h.note ? <Text style={styles.timelineNote}>{h.note}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.detailHeader}>
                  <View>
                    <Text style={styles.detailName}>{r.patientName}</Text>
                    <Text style={styles.detailMeta}>{r.patientAge} Yrs / {r.patientGender}</Text>
                  </View>
                  <View style={styles.priorityScore}>
                    <Text style={styles.priorityScoreLabel}>AI Priority Score</Text>
                    <Text style={styles.priorityScoreValue}>{r.aiPriorityScore} / 100</Text>
                  </View>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailField}>
                    <Text style={styles.detailFieldLabel}>Referring Facility</Text>
                    <Text style={styles.detailFieldValue}>{r.referringFacilityName}</Text>
                  </View>
                  <View style={styles.detailField}>
                    <Text style={styles.detailFieldLabel}>Destination Hospital</Text>
                    <Text style={styles.detailFieldValue}>{r.targetFacilityName}</Text>
                  </View>
                  <View style={styles.detailField}>
                    <Text style={styles.detailFieldLabel}>Assigned Specialist</Text>
                    <Text style={styles.detailFieldValue}>{r.assignedSpecialistName || '—'}</Text>
                  </View>
                </View>

                <Text style={styles.summaryLabel}>Clinical Case Summary</Text>
                <Text style={styles.summaryText}>{r.clinicalSummary}</Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {referrals.length === 0 && (
        <Text style={styles.emptyText}>No referrals recorded yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6', padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginBottom: 10 },
  cardSelected: { borderColor: '#15803D', borderWidth: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  referralCode: { fontSize: 11, fontWeight: '800', color: '#134E4A', fontFamily: 'monospace', backgroundColor: '#F0FDFA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityBadge: { fontSize: 9, fontWeight: '800', color: '#92400E', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityBadgeCritical: { color: '#7F1D1D', backgroundColor: '#FEE2E2' },
  patientName: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 8 },
  diagnosis: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  targetFacility: { fontSize: 11, fontWeight: '700', color: '#134E4A' },
  statusBadge: { fontSize: 10, fontWeight: '700', color: '#78350F', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, textTransform: 'capitalize' },
  detail: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  timelineList: { marginBottom: 14 },
  timelineItem: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB', marginTop: 4 },
  timelineDotCurrent: { backgroundColor: '#15803D' },
  timelineContent: { flex: 1 },
  timelineStatus: { fontSize: 11, fontWeight: '800', color: '#111827' },
  timelineTimestamp: { fontSize: 10, color: '#9CA3AF' },
  timelineNote: { fontSize: 11, color: '#4B5563', marginTop: 2 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailName: { fontSize: 15, fontWeight: '800', color: '#111827' },
  detailMeta: { fontSize: 12, color: '#6B7280' },
  priorityScore: { alignItems: 'flex-end' },
  priorityScoreLabel: { fontSize: 10, color: '#9CA3AF' },
  priorityScoreValue: { fontSize: 18, fontWeight: '800', color: '#DC2626' },
  detailGrid: { gap: 10, marginTop: 10 },
  detailField: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10 },
  detailFieldLabel: { fontSize: 10, color: '#6B7280', marginBottom: 2 },
  detailFieldValue: { fontSize: 12, fontWeight: '700', color: '#111827' },
  summaryLabel: { fontSize: 11, fontWeight: '800', color: '#111827', textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },
  summaryText: { fontSize: 12, color: '#4B5563', backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, lineHeight: 18 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 12 },
});
