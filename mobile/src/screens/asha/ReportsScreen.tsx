import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Share } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { backendApi } from '@arogyasetu/shared/services/api';
import { useAuth } from '../../services/auth/authContext';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'Reports'>;
type MonthlyReport = Awaited<ReturnType<typeof backendApi.getAshaMonthlyReport>>;

/** The current month and the five before it, newest first, as YYYY-MM. */
const recentMonths = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
    };
  });
};

/**
 * Mirrors frontend/src/pages/asha/Reports.tsx: the same Monthly Progress
 * Report (GET /api/analytics/asha/monthly), so the phone and the web show the
 * same counts for the same month.
 */
export function ReportsScreen(_props: Props) {
  const { currentUser } = useAuth();
  const months = recentMonths();
  const [month, setMonth] = useState(months[0].value);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (m: string) => {
    setIsLoading(true);
    setError('');
    setReport(null);
    try {
      setReport(await backendApi.getAshaMonthlyReport(m));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the report.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(month);
  }, [load, month]);

  const monthLabel = months.find((m) => m.value === month)?.label ?? month;

  const shareReport = () => {
    if (!report) return;
    const lines = [
      `Monthly Progress Report, ${monthLabel}`,
      `ASHA: ${currentUser?.name ?? ''}`,
      `Assigned patients: ${report.assignedPatients}`,
      '',
      ...report.rows.map((r) => `${r.indicator}: ${r.value}`),
      '',
      `Vaccine doses due or overdue: ${report.pending.vaccinesDue}`,
      `High-risk pregnancies being followed: ${report.pending.highRiskPregnancies}`,
      `Open tasks: ${report.pending.openTasks}`,
    ];
    void Share.share({ message: lines.join('\n') });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Monthly ASHA Progress Report (MPR)</Text>
      <Text style={styles.subtitle}>Counted from the visits, screenings and records you entered in the app</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.months}>
        {months.map((m) => (
          <Pressable key={m.value} onPress={() => setMonth(m.value)} style={[styles.monthChip, month === m.value && styles.monthChipActive]}>
            <Text style={[styles.monthText, month === m.value && styles.monthTextActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#15803D" />
        </View>
      ) : error || !report ? (
        <View style={styles.centered}>
          <Text style={styles.centeredText}>{error || 'No report available.'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => load(month)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{report.assignedPatients}</Text>
              <Text style={styles.statLabel}>Assigned Patients</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{report.rows.find((r) => r.key === 'homeVisits')?.value ?? 0}</Text>
              <Text style={styles.statLabel}>Home Visits This Month</Text>
            </View>
          </View>

          <View style={styles.openCard}>
            <Text style={styles.openTitle}>STILL OPEN</Text>
            <Text style={styles.openLine}>{report.pending.vaccinesDue} vaccine doses due</Text>
            <Text style={styles.openLine}>{report.pending.highRiskPregnancies} high-risk pregnancies</Text>
            <Text style={styles.openLine}>{report.pending.openTasks} open tasks</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Activity in {monthLabel}</Text>
            {report.rows.map((r) => (
              <View key={r.key} style={styles.row}>
                <Text style={styles.rowLabel}>{r.indicator}</Text>
                <Text style={styles.rowValue}>{r.value}</Text>
              </View>
            ))}
            <Text style={styles.cardHint}>
              Incentive amounts are set by the state NHM and verified by the ANM, so this report lists the activities only.
            </Text>
          </View>

          <Pressable style={styles.shareBtn} onPress={shareReport}>
            <Text style={styles.shareBtnText}>Share Report</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  months: { gap: 6, paddingVertical: 12 },
  monthChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F3F4F6' },
  monthChipActive: { backgroundColor: '#15803D' },
  monthText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  monthTextActive: { color: '#fff' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 30 },
  centeredText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  retryBtn: { backgroundColor: '#15803D', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, marginTop: 14 },
  retryBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  openCard: { backgroundColor: '#14532D', borderRadius: 14, padding: 16, marginBottom: 12, gap: 2 },
  openTitle: { fontSize: 11, fontWeight: '800', color: '#86EFAC', marginBottom: 4 },
  openLine: { fontSize: 13, fontWeight: '600', color: '#fff' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase', marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  rowLabel: { fontSize: 12, fontWeight: '600', color: '#111827', flexShrink: 1 },
  rowValue: { fontSize: 13, fontWeight: '800', color: '#15803D' },
  cardHint: { fontSize: 11, color: '#9CA3AF', marginTop: 10, lineHeight: 15 },
  shareBtn: { backgroundColor: '#15803D', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
