import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Linking, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { backendApi } from '@arogyasetu/shared/services/api';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'VillageMap'>;

type Household = Awaited<ReturnType<typeof backendApi.getAshaHouseholds>>[number];
type Status = Household['status'];

// Mirrors frontend/src/pages/asha/VillageMap.tsx, so the ASHA sees the same
// patients, statuses and alerts on the phone as on the web.
const STATUS: Record<Status, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#DC2626', bg: '#FEF2F2' },
  high_risk: { label: 'High risk', color: '#EA580C', bg: '#FFF7ED' },
  due: { label: 'Visit due', color: '#2563EB', bg: '#EFF6FF' },
  routine: { label: 'Up to date', color: '#059669', bg: '#ECFDF5' },
};

const ORDER: Status[] = ['critical', 'high_risk', 'due', 'routine'];

const ageOf = (dob?: string) => {
  if (!dob) return undefined;
  const years = (Date.now() - new Date(dob).getTime()) / (365.25 * 86400000);
  return years < 1 ? `${Math.max(0, Math.floor(years * 12))} mo` : `${Math.floor(years)} y`;
};

// Patient records hold a village, not coordinates, so directions search for
// the place rather than pretending to know the exact house.
const directionsUrl = (h: Household) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [h.address, h.village, h.taluka, h.district, 'Maharashtra'].filter(Boolean).join(', ')
  )}`;

export function VillageMapScreen({ navigation }: Props) {
  const [rows, setRows] = useState<Household[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Household | null>(null);

  useEffect(() => {
    backendApi
      .getAshaHouseholds()
      .then(setRows)
      .catch((err) => {
        setRows([]);
        setError(err instanceof Error ? err.message : 'Could not load your households.');
      });
  }, []);

  const term = search.trim().toLowerCase();

  // Grouped by village, the most urgent people first inside each.
  const villages = useMemo(() => {
    const visible = (rows ?? []).filter(
      (h) => (filter === 'all' || h.status === filter) && (!term || h.name.toLowerCase().includes(term) || (h.village ?? '').toLowerCase().includes(term))
    );
    const groups = new Map<string, Household[]>();
    for (const h of visible) {
      const key = h.village ?? 'Village not recorded';
      groups.set(key, [...(groups.get(key) ?? []), h]);
    }
    return [...groups.entries()]
      .map(([village, list]) => [village, [...list].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))] as const)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, filter, term]);

  const count = (s: Status) => (rows ?? []).filter((h) => h.status === s).length;

  if (!rows) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#15803D" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Village Health Grid</Text>
        <Text style={styles.subtitle}>
          {rows.length} assigned patients across {new Set(rows.map((r) => r.village)).size} villages, ranked by what their records show
        </Text>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['all', ...ORDER] as const).map((s) => (
            <Pressable key={s} onPress={() => setFilter(s)} style={[styles.filterChip, filter === s && styles.filterChipActive]}>
              <Text style={[styles.filterText, filter === s && styles.filterTextActive]}>
                {s === 'all' ? `All (${rows.length})` : `${STATUS[s].label} (${count(s)})`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextInput style={styles.search} placeholder="Search name or village..." value={search} onChangeText={setSearch} />

        {villages.length === 0 && (
          <Text style={styles.empty}>{rows.length === 0 ? 'No patients are assigned to you yet.' : 'Nobody matches this filter.'}</Text>
        )}

        {villages.map(([village, list]) => (
          <View key={village} style={styles.villageCard}>
            <View style={styles.villageHeader}>
              <Text style={styles.villageName}>{village}</Text>
              <Text style={styles.villageCount}>{list.length} patients</Text>
            </View>
            {list.map((h) => (
              <Pressable key={h.patientId} style={styles.row} onPress={() => setSelected(h)}>
                <View style={styles.rowTop}>
                  <View style={styles.rowName}>
                    <View style={[styles.dot, { backgroundColor: STATUS[h.status].color }]} />
                    <Text style={styles.name}>{h.name}</Text>
                  </View>
                  <Text style={styles.meta}>{[ageOf(h.dateOfBirth), h.gender].filter(Boolean).join(' · ')}</Text>
                </View>
                <Text style={styles.alertLine} numberOfLines={1}>
                  {h.alerts[0] ?? `Last visit ${h.lastVisit ?? 'never'}`}
                  {h.alerts.length > 1 ? ` +${h.alerts.length - 1} more` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          {selected && (
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{selected.name}</Text>
              <Text style={styles.modalSub}>
                {[selected.village, selected.taluka, selected.householdId && `Household ${selected.householdId}`].filter(Boolean).join(' · ')}
              </Text>
              <Text style={[styles.statusBadge, { color: STATUS[selected.status].color, backgroundColor: STATUS[selected.status].bg }]}>
                {STATUS[selected.status].label}
              </Text>

              {selected.alerts.length > 0 ? (
                selected.alerts.map((a) => (
                  <Text key={a} style={styles.alertBox}>
                    ⚠ {a}
                  </Text>
                ))
              ) : (
                <Text style={styles.meta}>Nothing outstanding for this patient.</Text>
              )}

              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Last home visit</Text>
                  <Text style={styles.infoValue}>{selected.lastVisit ?? 'Never'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Vaccines due</Text>
                  <Text style={styles.infoValue}>{selected.vaccinesDue}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{selected.phone ?? 'Not recorded'}</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionBtn, styles.actionPrimary]}
                  onPress={() => {
                    setSelected(null);
                    navigation.navigate('HomeVisits');
                  }}
                >
                  <Text style={styles.actionPrimaryText}>Record a visit</Text>
                </Pressable>
                {selected.phone ? (
                  <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${selected.phone}`)}>
                    <Text style={styles.actionText}>Call</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(directionsUrl(selected))}>
                  <Text style={styles.actionText}>Directions</Text>
                </Pressable>
              </View>

              <Pressable onPress={() => setSelected(null)}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF9F6' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  errorBanner: { backgroundColor: '#FEF2F2', color: '#B91C1C', padding: 12, borderRadius: 8, marginTop: 12, fontSize: 12 },
  filters: { gap: 6, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F3F4F6' },
  filterChipActive: { backgroundColor: '#15803D' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  filterTextActive: { color: '#fff' },
  search: { borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, marginBottom: 12 },
  empty: { textAlign: 'center', color: '#6B7280', fontSize: 12, padding: 24 },
  villageCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, marginBottom: 12 },
  villageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  villageName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  villageCount: { fontSize: 11, color: '#6B7280' },
  row: { backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#F3F4F6', padding: 12, marginTop: 8 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowName: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 14, fontWeight: '700', color: '#111827', flexShrink: 1 },
  meta: { fontSize: 11, color: '#6B7280', textTransform: 'capitalize' },
  alertLine: { fontSize: 11, color: '#4B5563', marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalSub: { fontSize: 12, color: '#6B7280' },
  statusBadge: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  alertBox: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', color: '#9A3412', fontWeight: '600', fontSize: 12, padding: 10, borderRadius: 10 },
  infoBox: { backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, gap: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 12, color: '#6B7280' },
  infoValue: { fontSize: 12, fontWeight: '600', color: '#111827' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  actionPrimary: { backgroundColor: '#15803D', borderColor: '#15803D', flexGrow: 1, alignItems: 'center' },
  actionPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionText: { color: '#374151', fontWeight: '700', fontSize: 13 },
  close: { textAlign: 'center', color: '#6B7280', fontWeight: '600', fontSize: 13, paddingVertical: 6 },
});
