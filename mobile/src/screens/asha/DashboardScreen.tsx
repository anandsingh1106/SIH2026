import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import { syncQueueManager } from '../../services/offline/syncQueueManager';
import type { Task, Referral, Patient } from '@arogyasetu/shared/types';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'AshaDashboard'>;

/**
 * Mirrors frontend/src/pages/asha/Dashboard.tsx's data loading exactly —
 * same three calls, same sync-queue subscription. The web version also
 * shows two metric cards with hardcoded numbers ("3 Cases", "8 Due"); those
 * are left out here rather than carried over, since there is no API behind
 * them on either platform yet.
 */
export function DashboardScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [, setPatients] = useState<Patient[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [tList, rList, pList] = await Promise.all([
      dataService.getTasks(),
      dataService.getReferrals(),
      dataService.getPatients(),
    ]);
    setTasks(tList);
    setReferrals(rList);
    setPatients(pList);
  }, []);

  useEffect(() => {
    load();
    const unsubSync = syncQueueManager.subscribe((s) => setPendingSyncCount(s.pendingCount));
    const unsubData = dataService.subscribe(() => load());
    return () => {
      unsubSync();
      unsubData();
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const criticalReferrals = referrals.filter((r) => r.priority === 'critical' || r.status === 'in_transit');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={() => navigation.navigate('RegisterPatient')}>
          <Text style={styles.actionButtonText}>Register Patient</Text>
        </Pressable>
        <Pressable style={styles.actionButtonSecondary} onPress={() => navigation.navigate('VillageMap')}>
          <Text style={styles.actionButtonSecondaryText}>Household Map</Text>
        </Pressable>
      </View>

      {criticalReferrals.length > 0 && (
        <Pressable style={styles.alertBar} onPress={() => navigation.navigate('Referrals')}>
          <Text style={styles.alertTitle}>Active High-Risk Case in Transit</Text>
          <Text style={styles.alertBody}>
            {criticalReferrals[0].patientName} ({criticalReferrals[0].provisionalDiagnosis})
          </Text>
        </Pressable>
      )}

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{pendingTasks.length}</Text>
          <Text style={styles.metricLabel}>Today's Priority Tasks</Text>
        </View>
        <Pressable style={styles.metricCard} onPress={() => navigation.navigate('VisitLog')}>
          <Text style={styles.metricValue}>{pendingSyncCount}</Text>
          <Text style={styles.metricLabel}>
            {pendingSyncCount > 0 ? 'Queued for Sync' : 'Fully Synced'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Task List</Text>
          <Pressable onPress={() => navigation.navigate('Tasks')}>
            <Text style={styles.sectionLink}>View All ({tasks.length})</Text>
          </Pressable>
        </View>

        {pendingTasks.slice(0, 4).map((task) => (
          <Pressable
            key={task.id}
            style={styles.taskCard}
            onPress={() => navigation.navigate('HomeVisits')}
          >
            <View style={styles.taskHeader}>
              <Text style={styles.taskPriority}>{(task.priority ?? '').toUpperCase()}</Text>
              <Text style={styles.taskTitle}>{task.title}</Text>
            </View>
            <Text style={styles.taskDescription}>{task.description}</Text>
            <Text style={styles.taskMeta}>
              {task.patientName} · {task.village} ({task.householdNumber}) · Due {task.dueTime}
            </Text>
          </Pressable>
        ))}

        {pendingTasks.length === 0 && (
          <Text style={styles.emptyText}>No pending tasks right now.</Text>
        )}
      </View>

      <View style={styles.quickGrid}>
        <Pressable style={styles.quickTile} onPress={() => navigation.navigate('HomeVisits')}>
          <Text style={styles.quickTileText}>Home Visit</Text>
        </Pressable>
        <Pressable style={styles.quickTile} onPress={() => navigation.navigate('MaternalCare')}>
          <Text style={styles.quickTileText}>Maternal ANC</Text>
        </Pressable>
        <Pressable style={styles.quickTile} onPress={() => navigation.navigate('Immunization')}>
          <Text style={styles.quickTileText}>Immunization</Text>
        </Pressable>
        <Pressable style={styles.quickTile} onPress={() => navigation.navigate('NcdScreening')}>
          <Text style={styles.quickTileText}>NCD Screening</Text>
        </Pressable>
        <Pressable style={styles.quickTile} onPress={() => navigation.navigate('VisitLog')}>
          <Text style={styles.quickTileText}>Visit Log</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Patients in Referral Care</Text>
          <Pressable onPress={() => navigation.navigate('Referrals')}>
            <Text style={styles.sectionLink}>View ({referrals.length})</Text>
          </Pressable>
        </View>

        {referrals.slice(0, 3).map((r) => (
          <View key={r.id} style={styles.referralCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{r.patientName}</Text>
              <Text style={styles.referralStatus}>{r.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <Text style={styles.taskDescription}>{r.provisionalDiagnosis}</Text>
            <Text style={styles.taskMeta}>To: {r.targetFacilityName}</Text>
          </View>
        ))}

        {referrals.length === 0 && (
          <Text style={styles.emptyText}>No active referrals.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  actions: { flexDirection: 'row', gap: 8, padding: 16 },
  actionButton: { flex: 1, backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionButtonSecondary: { flex: 1, backgroundColor: '#134E4A', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  actionButtonSecondaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  alertBar: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: '#FEF2F2', borderLeftWidth: 4,
    borderLeftColor: '#DC2626', borderRadius: 8, padding: 14,
  },
  alertTitle: { color: '#7F1D1D', fontWeight: '700', fontSize: 12 },
  alertBody: { color: '#991B1B', fontSize: 12, marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  metricCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, alignItems: 'center',
  },
  metricValue: { fontSize: 24, fontWeight: '800', color: '#111827' },
  metricLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#111827', textTransform: 'uppercase' },
  sectionLink: { fontSize: 12, fontWeight: '700', color: '#15803D' },
  taskCard: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 12, marginBottom: 8,
  },
  taskHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  taskPriority: {
    fontSize: 9, fontWeight: '800', color: '#B91C1C', backgroundColor: '#FEE2E2',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  taskTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  taskDescription: { fontSize: 12, color: '#4B5563', marginBottom: 4 },
  taskMeta: { fontSize: 11, color: '#6B7280' },
  emptyText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 20 },
  quickTile: {
    width: '47%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  quickTileText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  referralCard: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 12, marginBottom: 8,
  },
  referralStatus: {
    fontSize: 9, fontWeight: '800', color: '#92400E', backgroundColor: '#FEF3C7',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto',
  },
});
