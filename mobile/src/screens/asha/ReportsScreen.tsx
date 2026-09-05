import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { backendApi, AshaAnalytics } from '@arogyasetu/shared/services/api';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'Reports'>;

/**
 * Mirrors frontend/src/pages/asha/Reports.tsx in spirit, but not in
 * content. The web version is a fully client-side mock: fixed target/
 * achieved numbers, ₹ incentive rates and a "Download CSV" button that
 * just shows an alert() — none of that is backed by any table (no
 * delivery-outcome tracking, no NHM incentive-rate config exists in the
 * schema). Building that properly is its own scoped piece of work.
 *
 * This screen instead surfaces the real counts the backend already computes
 * per worker (GET /api/analytics/asha, ashaAnalytics() in
 * analyticsService.js) — assigned caseload, open/completed tasks, home
 * visits logged, high-risk maternal cases, and screening backlogs. No ₹
 * figures, because none exist to report honestly.
 */
export function ReportsScreen(_props: Props) {
  const [data, setData] = useState<AshaAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setData(await backendApi.getAshaAnalytics());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your activity summary.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#15803D" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>{error || 'No activity summary available.'}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const taskCompletionRate =
    data.tasksOpen + data.tasksCompleted > 0
      ? Math.round((data.tasksCompleted / (data.tasksOpen + data.tasksCompleted)) * 100)
      : null;

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          Live counts from your own caseload — not a monthly incentive statement. The Monthly
          Progress Report (MPR) with NHM incentive rates needs its own tracked delivery-outcome
          data, which isn't recorded anywhere yet.
        </Text>
      </View>

      <View style={styles.grid}>
        <StatCard label="Assigned Patients" value={data.assignedPatients} />
        <StatCard label="Home Visits Logged" value={data.homeVisits} />
        <StatCard label="Tasks Open" value={data.tasksOpen} tone="warn" />
        <StatCard label="Tasks Completed" value={data.tasksCompleted} tone="good" />
        <StatCard label="High-Risk Maternal Cases" value={data.highRiskMaternal} tone="danger" />
        <StatCard label="High-Risk NCD Screenings" value={data.ncdHighRisk} tone="danger" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vaccinations Due or Overdue</Text>
        <Text style={styles.bigNumber}>{data.vaccinationsDue}</Text>
        <Text style={styles.cardHint}>Across your assigned caseload — check the Immunization ledger to act on these.</Text>
      </View>

      {taskCompletionRate !== null && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Task Completion Rate</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${taskCompletionRate}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {data.tasksCompleted} of {data.tasksOpen + data.tasksCompleted} tasks completed ({taskCompletionRate}%)
          </Text>
        </View>
      )}

      <Pressable style={styles.refreshBtn} onPress={load}>
        <Text style={styles.refreshBtnText}>Refresh</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'warn' | 'danger' }) {
  return (
    <View style={[styles.statCard, tone === 'good' && styles.statGood, tone === 'warn' && styles.statWarn, tone === 'danger' && styles.statDanger]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6', padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#FAF9F6' },
  centeredText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  retryBtn: { backgroundColor: '#15803D', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, marginTop: 14 },
  retryBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  noteBox: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, padding: 12, marginBottom: 16 },
  noteText: { fontSize: 11, color: '#1E3A8A', lineHeight: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { width: '47%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14 },
  statGood: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statWarn: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  statDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase' },
  bigNumber: { fontSize: 32, fontWeight: '800', color: '#DC2626', marginTop: 8 },
  cardHint: { fontSize: 11, color: '#9CA3AF', marginTop: 6, lineHeight: 15 },
  progressTrack: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: 10, backgroundColor: '#15803D', borderRadius: 5 },
  progressLabel: { fontSize: 11, color: '#6B7280', marginTop: 8 },
  refreshBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 24 },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: '#374151' },
});
