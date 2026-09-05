import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import { syncQueueManager } from '../../services/offline/syncQueueManager';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'VisitLog'>;

interface LogEntry {
  token: string;
  patientName: string;
  date: string;
  riskLevel?: string;
  referralRecommended: boolean;
  observations?: string;
  synced: boolean;
  queuedAt?: string;
  syncError?: string;
  retryCount?: number;
}

type Filter = 'all' | 'pending' | 'synced';

/** Mirrors frontend/src/pages/asha/VisitLog.tsx: merges server visits with the local sync queue by token. */
export function VisitLogScreen({ navigation }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingToken, setSyncingToken] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [visits, queue] = await Promise.all([dataService.getHomeVisits(), syncQueueManager.getQueue()]);

      const synced: LogEntry[] = visits.map((v) => ({
        token: (v as { householdId?: string }).householdId || '—',
        patientName: (v as { patientName?: string }).patientName || 'Unknown patient',
        date: v.date,
        riskLevel: (v as { riskLevel?: string }).riskLevel,
        referralRecommended: Boolean(v.referralRecommended),
        observations: v.observations,
        synced: true,
      }));

      const pending: LogEntry[] = queue
        .filter((op) => op.entity === 'home_visit')
        .map((op) => {
          const payload = (op.data ?? {}) as Record<string, unknown>;
          return {
            token: op.id,
            patientName: (payload.patientName as string) || 'Queued visit',
            date: (payload.visitDate as string) || op.timestamp.slice(0, 10),
            riskLevel: payload.riskLevel as string | undefined,
            referralRecommended: Boolean(payload.referralRecommended),
            observations: payload.observations as string | undefined,
            synced: false,
            queuedAt: op.timestamp,
            syncError: op.error,
            retryCount: op.retryCount,
          };
        });

      setEntries([...pending, ...synced].sort((a, b) => {
        if (a.synced !== b.synced) return a.synced ? 1 : -1;
        return (b.date ?? '').localeCompare(a.date ?? '');
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = dataService.subscribe(({ entity }) => {
      if (entity === 'home_visits') load();
    });
    const unsubSync = syncQueueManager.subscribe(() => load());
    return () => { unsub(); unsubSync(); };
  }, [load]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await syncQueueManager.processQueue();
      await load();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncOne = async (token: string) => {
    setSyncingToken(token);
    try {
      await syncQueueManager.syncOne(token);
      await load();
    } finally {
      setSyncingToken(null);
    }
  };

  const pendingCount = entries.filter((e) => !e.synced).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter === 'pending' && e.synced) return false;
      if (filter === 'synced' && !e.synced) return false;
      if (!q) return true;
      return e.token.toLowerCase().includes(q) || e.patientName.toLowerCase().includes(q) || (e.date ?? '').includes(q);
    });
  }, [entries, query, filter]);

  const riskLabel = (risk?: string) => {
    const v = String(risk ?? '').toUpperCase();
    if (v === 'CRITICAL') return 'CRITICAL';
    if (v === 'HIGH') return 'HIGH RISK';
    if (v === 'MODERATE') return 'MODERATE';
    if (v === 'LOW') return 'NORMAL';
    return null;
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>
          {isLoading
            ? 'Loading visits…'
            : `${entries.length} visit${entries.length === 1 ? '' : 's'} recorded` +
              (pendingCount > 0 ? ` · ${pendingCount} waiting to sync` : '')}
        </Text>
        <View style={styles.headerActions}>
          {pendingCount > 0 && (
            <Pressable style={styles.syncNowButton} onPress={handleSyncNow} disabled={isSyncing}>
              {isSyncing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.syncNowButtonText}>Sync {pendingCount} now</Text>}
            </Pressable>
          )}
          <Pressable style={styles.recordButton} onPress={() => navigation.navigate('HomeVisits')}>
            <Text style={styles.recordButtonText}>Record Visit</Text>
          </Pressable>
        </View>
      </View>

      {pendingCount > 0 && (
        <View style={styles.pendingNotice}>
          <Text style={styles.pendingNoticeText}>
            {pendingCount} visit{pendingCount === 1 ? '' : 's'} recorded on this device have not reached the
            server yet. They sync automatically when connectivity returns.
          </Text>
        </View>
      )}

      <TextInput style={styles.search} placeholder="Search by token, patient or date…" value={query} onChangeText={setQuery} />

      <View style={styles.filterRow}>
        {(['all', 'pending', 'synced'] as Filter[]).map((key) => (
          <Pressable key={key} style={[styles.filterPill, filter === key && styles.filterPillActive]} onPress={() => setFilter(key)}>
            <Text style={[styles.filterPillText, filter === key && styles.filterPillTextActive]}>
              {key === 'all' ? 'All' : key === 'pending' ? 'Not synced' : 'Synced'}
              {key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.list}>
        {isLoading ? (
          <ActivityIndicator style={styles.loading} color="#15803D" />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{entries.length === 0 ? 'No home visits recorded yet.' : 'No visits match this view.'}</Text>
            {entries.length === 0 && (
              <Pressable style={styles.recordButton} onPress={() => navigation.navigate('HomeVisits')}>
                <Text style={styles.recordButtonText}>Record your first visit</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filtered.map((e, i) => {
            const risk = riskLabel(e.riskLevel);
            return (
              <View key={`${e.token}-${i}`} style={[styles.entryCard, !e.synced && styles.entryCardPending]}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryToken}>{e.token}</Text>
                  {risk ? <Text style={styles.riskBadge}>{risk}</Text> : null}
                  {e.referralRecommended ? <Text style={styles.referralBadge}>REFERRAL RAISED</Text> : null}
                </View>
                <Text style={styles.entryPatient}>{e.patientName}</Text>
                {e.observations ? <Text style={styles.entryObservations} numberOfLines={2}>{e.observations}</Text> : null}
                <Text style={styles.entryMeta}>
                  Visited {e.date}
                  {e.queuedAt ? ` · Queued ${new Date(e.queuedAt).toLocaleString('en-IN')}` : ''}
                </Text>

                {e.syncError ? (
                  <Text style={styles.entryError}>
                    {e.syncError}
                    {e.retryCount ? ` (${e.retryCount} attempt${e.retryCount === 1 ? '' : 's'})` : ''}
                  </Text>
                ) : null}

                <View style={styles.entryStatusRow}>
                  {e.synced ? (
                    <Text style={styles.syncedLabel}>✓ Synced</Text>
                  ) : (
                    <>
                      <Text style={styles.pendingLabel}>Pending</Text>
                      <Pressable style={styles.syncOneButton} onPress={() => handleSyncOne(e.token)} disabled={syncingToken !== null}>
                        {syncingToken === e.token ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.syncOneButtonText}>Sync</Text>}
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}

        {!isLoading && filtered.length > 0 && (
          <Text style={styles.footerText}>Showing {filtered.length} of {entries.length} visits</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { padding: 16, paddingBottom: 8 },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  headerActions: { flexDirection: 'row', gap: 8 },
  syncNowButton: { flex: 1, backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  syncNowButtonText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  recordButton: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  recordButtonText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  pendingNotice: { marginHorizontal: 16, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, padding: 10, marginBottom: 8 },
  pendingNoticeText: { fontSize: 11, color: '#92400E' },
  search: { marginHorizontal: 16, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterPillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  filterPillText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  filterPillTextActive: { color: '#fff' },
  list: { flex: 1, paddingHorizontal: 16 },
  loading: { marginTop: 40 },
  empty: { alignItems: 'center', marginTop: 40, gap: 12 },
  emptyText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  entryCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 10 },
  entryCardPending: { borderColor: '#FCD34D', borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  entryHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  entryToken: { fontSize: 13, fontWeight: '800', color: '#15803D', fontFamily: 'monospace' },
  riskBadge: { fontSize: 9, fontWeight: '800', color: '#B91C1C', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  referralBadge: { fontSize: 9, fontWeight: '800', color: '#991B1B', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  entryPatient: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  entryObservations: { fontSize: 11, color: '#4B5563', marginBottom: 4 },
  entryMeta: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  entryError: { fontSize: 10, color: '#B91C1C', backgroundColor: '#FEF2F2', padding: 6, borderRadius: 6, marginTop: 4, marginBottom: 4 },
  entryStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  syncedLabel: { fontSize: 12, fontWeight: '700', color: '#15803D' },
  pendingLabel: { fontSize: 12, fontWeight: '700', color: '#B45309' },
  syncOneButton: { backgroundColor: '#15803D', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  syncOneButtonText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  footerText: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginVertical: 16 },
});
