import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { syncQueueManager } from '../../services/offline/syncQueueManager';
import type { SyncOperation } from '@arogyasetu/shared/types';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'OfflineSync'>;

/**
 * Mirrors frontend/src/pages/asha/OfflineSync.tsx. The web page also shows a
 * "Cached Tables Overview" grid backed by its IndexedDB mirror of
 * patients/tasks/referrals/medicines — mobile has no such local read cache
 * (dataService here calls the API directly), so that section is dropped
 * rather than shown with fabricated counts. The connectivity banner and
 * pending mutation queue are both backed by the real SQLite-backed queue.
 */
export function OfflineSyncScreen(_props: Props) {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<SyncOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadQueue = async () => {
    setQueue(await syncQueueManager.getQueue());
  };

  useEffect(() => {
    loadQueue();
    const unsub = syncQueueManager.subscribe((s) => {
      setIsOnline(s.isOnline);
      setIsSyncing(s.isSyncing);
      loadQueue();
    });
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncQueueManager.processQueue();
    await loadQueue();
    setIsSyncing(false);
  };

  return (
    <ScrollView style={styles.screen}>
      <Pressable
        style={[styles.syncBtn, isSyncing && styles.btnDisabled]}
        onPress={handleManualSync}
        disabled={isSyncing}
      >
        {isSyncing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.syncBtnText}>Force Queue Sync</Text>
        )}
      </Pressable>

      <View style={[styles.banner, isOnline ? styles.bannerOnline : styles.bannerOffline]}>
        <Text style={styles.bannerTitle}>
          {isOnline ? 'Device Online (Connected)' : 'Device Offline (Field Mode Active)'}
        </Text>
        <Text style={styles.bannerSubtitle}>
          {isOnline
            ? 'All newly created patient visits synchronize in real time.'
            : 'Zero data loss mode active. All forms and records save safely to device memory.'}
        </Text>
        <Text style={[styles.pendingBadge, isOnline ? styles.pendingBadgeOnline : styles.pendingBadgeOffline]}>
          {queue.length} Pending Records Queued
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Pending Mutation Queue ({queue.length})</Text>
      {queue.length > 0 && (
        <Text style={styles.hintText}>Auto-retries on reconnection</Text>
      )}

      {queue.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>All local changes are fully synchronized with the state servers.</Text>
        </View>
      ) : (
        queue.map((op) => (
          <View key={op.id} style={styles.queueRow}>
            <View style={styles.queueRowTop}>
              <Text style={styles.queueEntity}>{op.entity.toUpperCase()}</Text>
              <Text style={[styles.queueStatus, op.status === 'synced' ? styles.statusSynced : styles.statusPending]}>
                {(op.status ?? '').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.queueMeta}>
              {op.action} · {op.entityId}
            </Text>
            <Text style={styles.queueTime}>{new Date(op.timestamp).toLocaleTimeString()}</Text>
            {op.error ? <Text style={styles.queueError}>{op.error}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6', padding: 16 },
  syncBtn: { backgroundColor: '#15803D', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  syncBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  btnDisabled: { opacity: 0.7 },
  banner: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  bannerOnline: { backgroundColor: '#F0FDFA', borderColor: '#99F6E4' },
  bannerOffline: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  bannerSubtitle: { fontSize: 11, color: '#4B5563', marginTop: 4 },
  pendingBadge: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: 10, overflow: 'hidden' },
  pendingBadgeOnline: { backgroundColor: '#D1FAE5', color: '#065F46' },
  pendingBadgeOffline: { backgroundColor: '#FEF3C7', color: '#92400E' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'uppercase' },
  hintText: { fontSize: 11, color: '#9CA3AF', marginTop: 2, marginBottom: 10 },
  emptyBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 20, marginTop: 10 },
  emptyText: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  queueRow: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginTop: 10 },
  queueRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queueEntity: { fontSize: 11, fontWeight: '800', color: '#134E4A' },
  queueStatus: { fontSize: 9, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  statusSynced: { backgroundColor: '#D1FAE5', color: '#065F46' },
  statusPending: { backgroundColor: '#FEF3C7', color: '#92400E' },
  queueMeta: { fontSize: 11, color: '#4B5563', marginTop: 4, textTransform: 'capitalize' },
  queueTime: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  queueError: { fontSize: 10, color: '#B91C1C', marginTop: 4 },
});
