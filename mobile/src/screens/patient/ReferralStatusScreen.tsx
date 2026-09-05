import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import type { Referral } from '@arogyasetu/shared/types';
import type { PatientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PatientStackParamList, 'ReferralStatus'>;

const PRIORITY_STYLE: Record<Referral['priority'], { bg: string; fg: string; label: string }> = {
  critical: { bg: '#FEE2E2', fg: '#991B1B', label: 'Critical' },
  high: { bg: '#FEF3C7', fg: '#92400E', label: 'High' },
  moderate: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Moderate' },
  low: { bg: '#F3F4F6', fg: '#4B5563', label: 'Low' },
};

/**
 * Mirrors frontend/src/pages/patient/ReferralStatus.tsx. Renders the journey
 * as a compact timeline list rather than pulling in the web's dedicated
 * ReferralTimelineWidget component.
 */
export function ReferralStatusScreen(_props: Props) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    dataService
      .getReferrals()
      .then((rows) => {
        if (cancelled) return;
        setReferrals([...rows].sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))));
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
      {loading && <Text style={styles.emptyText}>Loading your referrals…</Text>}

      {!loading && referrals.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No active referrals</Text>
          <Text style={styles.emptyHint}>
            If your doctor creates a specialist referral for you, it will appear here.
          </Text>
        </View>
      )}

      {referrals.map((referral) => {
        const pc = PRIORITY_STYLE[referral.priority];
        return (
          <View key={referral.id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.referralCode}>Referral #{referral.referralCode}</Text>
              <Text style={[styles.priorityBadge, { backgroundColor: pc.bg, color: pc.fg }]}>{pc.label}</Text>
            </View>
            <Text style={styles.specialtyBadge}>{referral.specialty}</Text>
            <Text style={styles.byText}>Referred by {referral.referringDoctorName}</Text>
            <Text style={styles.facilityText}>{referral.referringFacilityName}</Text>

            <View style={styles.detailGrid}>
              <View style={styles.detailField}>
                <Text style={styles.detailLabel}>Referred to</Text>
                <Text style={styles.detailValue}>{referral.targetFacilityName}</Text>
              </View>
              {referral.assignedSpecialistName ? (
                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Assigned Specialist</Text>
                  <Text style={styles.detailValue}>{referral.assignedSpecialistName}</Text>
                </View>
              ) : null}
            </View>

            {referral.aiPriorityScore > 0 && (
              <View style={styles.aiBox}>
                <Text style={styles.aiLabel}>AI Priority Assessment</Text>
                <View style={styles.aiBarTrack}>
                  <View style={[styles.aiBarFill, { width: `${referral.aiPriorityScore}%` }]} />
                </View>
                <Text style={styles.aiScore}>{referral.aiPriorityScore}/100</Text>
                {referral.aiRationale ? <Text style={styles.aiRationale}>{referral.aiRationale}</Text> : null}
              </View>
            )}

            <Text style={styles.timelineLabel}>Journey Tracker</Text>
            <View style={styles.timelineList}>
              {referral.history.map((h, i) => (
                <View key={i} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, i === referral.history.length - 1 && styles.timelineDotCurrent]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineStatus}>{h.status.replace('_', ' ').toUpperCase()}</Text>
                    <Text style={styles.timelineTimestamp}>{new Date(h.timestamp).toLocaleString('en-IN')}</Text>
                    {h.note ? <Text style={styles.timelineNote}>{h.note}</Text> : null}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Clinical Summary (from your doctor)</Text>
              <Text style={styles.summaryText}>{referral.clinicalSummary}</Text>
            </View>
          </View>
        );
      })}

      <View style={styles.helpBox}>
        <Text style={styles.helpTitle}>What to do while waiting?</Text>
        <Text style={styles.helpItem}>• Keep taking your current medicines as prescribed</Text>
        <Text style={styles.helpItem}>• Note down any new or worsening symptoms</Text>
        <Text style={styles.helpItem}>• Carry your ABHA card and previous reports to the appointment</Text>
        <Text style={styles.helpItem}>• Call 108 immediately if your condition worsens suddenly</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6', padding: 16 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 12 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#4B5563' },
  emptyHint: { fontSize: 12, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  referralCode: { fontSize: 13, fontWeight: '800', color: '#111827' },
  priorityBadge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  specialtyBadge: { fontSize: 10, fontWeight: '700', color: '#1D4ED8', backgroundColor: '#DBEAFE', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 6, textTransform: 'capitalize' },
  byText: { fontSize: 12, color: '#4B5563', marginTop: 8 },
  facilityText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  detailGrid: { marginTop: 12, gap: 10 },
  detailField: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10 },
  detailLabel: { fontSize: 10, color: '#6B7280' },
  detailValue: { fontSize: 12, fontWeight: '700', color: '#111827', marginTop: 2 },
  aiBox: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, marginTop: 12 },
  aiLabel: { fontSize: 11, fontWeight: '700', color: '#1D4ED8' },
  aiBarTrack: { height: 6, backgroundColor: '#BFDBFE', borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  aiBarFill: { height: 6, backgroundColor: '#2563EB', borderRadius: 3 },
  aiScore: { fontSize: 10, fontWeight: '800', color: '#1D4ED8', marginTop: 4 },
  aiRationale: { fontSize: 11, color: '#2563EB', marginTop: 4 },
  timelineLabel: { fontSize: 12, fontWeight: '800', color: '#374151', marginTop: 16, marginBottom: 8 },
  timelineList: {},
  timelineItem: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB', marginTop: 4 },
  timelineDotCurrent: { backgroundColor: '#15803D' },
  timelineContent: { flex: 1 },
  timelineStatus: { fontSize: 11, fontWeight: '800', color: '#111827' },
  timelineTimestamp: { fontSize: 10, color: '#9CA3AF' },
  timelineNote: { fontSize: 11, color: '#4B5563', marginTop: 2 },
  summaryBox: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, marginTop: 8 },
  summaryLabel: { fontSize: 10, fontWeight: '800', color: '#6B7280', marginBottom: 4 },
  summaryText: { fontSize: 12, color: '#374151', lineHeight: 17 },
  helpBox: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#DCFCE7', borderRadius: 14, padding: 16, marginBottom: 24 },
  helpTitle: { fontSize: 13, fontWeight: '800', color: '#166534', marginBottom: 8 },
  helpItem: { fontSize: 11, color: '#15803D', marginBottom: 4, lineHeight: 16 },
});
