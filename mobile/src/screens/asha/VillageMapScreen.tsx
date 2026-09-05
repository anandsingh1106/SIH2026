import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, PanResponder, Linking } from 'react-native';
import Svg, { Rect, Path, Circle, Text as SvgText, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'VillageMap'>;

interface Household {
  id: string;
  number: string;
  headName: string;
  pada: string;
  x: number;
  y: number;
  status: 'critical' | 'high_risk' | 'routine' | 'visited';
  membersCount: number;
  alerts: string[];
  dueTask?: string;
}

// Same fixture data as frontend/src/components/maps/VillageHouseholdMap.tsx —
// this whole visualization is a bespoke SVG demo, not backed by a real map
// SDK or a households API on either platform.
const HOUSEHOLDS: Household[] = [
  { id: 'hh-1', number: 'HH-104', headName: 'Sachin Gaikwad', pada: 'Kolvan Road', x: 28, y: 35, status: 'critical', membersCount: 4, alerts: ['Kavita Gaikwad (28 Wks ANC, Severe Anemia)', 'Aarav Gaikwad (MR-1 Vaccine Due)'], dueTask: '108 Ambulance Coordination' },
  { id: 'hh-2', number: 'HH-042', headName: 'Ramesh Patil', pada: 'Vetal Pada', x: 55, y: 22, status: 'high_risk', membersCount: 5, alerts: ['Ramesh Patil (BP 146/94, T2DM Follow-up)'], dueTask: 'Monthly Blood Sugar Check' },
  { id: 'hh-3', number: 'HH-089', headName: 'Eknath Shinde', pada: 'Wadi Vasti', x: 75, y: 60, status: 'high_risk', membersCount: 3, alerts: ['Eknath Shinde (Chest pain referral to Aundh)'], dueTask: 'Transport Verification' },
  { id: 'hh-4', number: 'HH-012', headName: 'Anandrao Jadhav', pada: 'Gaothan', x: 42, y: 68, status: 'routine', membersCount: 6, alerts: ['Vandana Jadhav (CBAC 30+ Screening Due)'], dueTask: 'CBAC Survey' },
  { id: 'hh-5', number: 'HH-031', headName: 'Sunil More', pada: 'Koliwada', x: 20, y: 72, status: 'visited', membersCount: 4, alerts: ['PNC Visit Day 14 Completed'], dueTask: 'Completed' },
  { id: 'hh-6', number: 'HH-067', headName: 'Mahadev Bhosale', pada: 'Vetal Pada', x: 62, y: 40, status: 'routine', membersCount: 3, alerts: ['Deworming Tablet Distribution'], dueTask: 'Albendazole Follow-up' },
];

const PIN_COLOR: Record<Household['status'], string> = {
  critical: '#DC2626',
  high_risk: '#F59E0B',
  routine: '#0F766E',
  visited: '#059669',
};

type Filter = 'all' | 'critical' | 'high_risk' | 'pending';

const VIEW = 100;

/**
 * Mirrors frontend/src/components/maps/VillageHouseholdMap.tsx. Web supports
 * mouse drag + wheel zoom over an SVG viewBox; this uses PanResponder for
 * one-finger drag over the same [0,100] user-space viewBox instead of pulling
 * in a full gesture-handler dependency for a demo map.
 */
export function VillageMapScreen(_props: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Household | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const mapSize = useRef({ width: 1, height: 1 });

  const clampPan = (p: { x: number; y: number }, z: number) => {
    const limit = Math.max(0, VIEW - VIEW / z);
    return { x: Math.min(Math.max(p.x, 0), limit), y: Math.min(Math.max(p.y, 0), limit) };
  };

  const zoomBy = (factor: number) => {
    setZoom((z) => {
      const next = Math.min(Math.max(z * factor, 1), 4);
      setPan((p) => {
        const cx = p.x + VIEW / 2 / z;
        const cy = p.y + VIEW / 2 / z;
        return clampPan({ x: cx - VIEW / 2 / next, y: cy - VIEW / 2 / next }, next);
      });
      return next;
    });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gesture) =>
        zoom > 1 && (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4),
      onPanResponderGrant: () => {
        panStart.current = { ...pan };
      },
      onPanResponderMove: (_e, gesture) => {
        const { width, height } = mapSize.current;
        const dx = (gesture.dx / width) * (VIEW / zoom);
        const dy = (gesture.dy / height) * (VIEW / zoom);
        setPan(clampPan({ x: panStart.current.x - dx, y: panStart.current.y - dy }, zoom));
      },
    })
  ).current;

  const filtered = HOUSEHOLDS.filter((h) => {
    if (filter === 'critical') return h.status === 'critical';
    if (filter === 'high_risk') return h.status === 'high_risk';
    if (filter === 'pending') return h.status !== 'visited';
    return true;
  });

  const viewBox = `${pan.x} ${pan.y} ${VIEW / zoom} ${VIEW / zoom}`;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Paud Village Health Grid & Household Geolocation</Text>
        <Text style={styles.subtitle}>
          284 Households mapped across 4 Padas (Vetal Pada, Kolvan Road, Wadi Vasti, Gaothan)
        </Text>
      </View>

      <View style={styles.filterRow}>
        {(
          [
            ['all', `All (${HOUSEHOLDS.length})`],
            ['critical', `Critical (${HOUSEHOLDS.filter((h) => h.status === 'critical').length})`],
            ['high_risk', `High Risk (${HOUSEHOLDS.filter((h) => h.status === 'high_risk').length})`],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.filterPill, filter === key && styles.filterPillActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.filterPillText, filter === key && styles.filterPillTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View
        style={styles.mapBox}
        onLayout={(e) => {
          mapSize.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
        }}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height="100%" viewBox={viewBox}>
          <Defs>
            <RadialGradient id="gradTerrain" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#d1fae5" stopOpacity={0.8} />
              <Stop offset="100%" stopColor="#f0fdf4" stopOpacity={0.4} />
            </RadialGradient>
          </Defs>
          <Rect width={100} height={100} fill="url(#gradTerrain)" />
          <Path d="M0,45 Q30,60 50,40 T100,65" fill="none" stroke="#93c5fd" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
          <Path d="M10,10 L50,45 L90,20 M50,45 L40,90 M50,45 L80,85" fill="none" stroke="#cbd5e1" strokeWidth={1.8} strokeDasharray="2 1" />

          <G transform="translate(48, 42)">
            <Circle r={4} fill="#0f766e" />
            <Circle r={7} fill="none" stroke="#0f766e" strokeWidth={0.8} strokeDasharray="1 1" />
            <SvgText x={6} y={2} fontSize={2.8} fontWeight="bold" fill="#0f766e">
              PHC Paud Subcenter
            </SvgText>
          </G>

          <G transform="translate(24, 30)">
            <Rect x={-3} y={-3} width={6} height={6} fill="#f59e0b" rx={1} />
            <SvgText x={4} y={1} fontSize={2.4} fontWeight="bold" fill="#b45309">
              Anganwadi 01
            </SvgText>
          </G>

          {filtered.map((hh) => {
            const k = 1 / zoom;
            return (
              <G key={hh.id} transform={`translate(${hh.x}, ${hh.y})`} onPress={() => setSelected(hh)}>
                <Circle r={4 * k} fill={PIN_COLOR[hh.status]} stroke="#fff" strokeWidth={1.2 * k} />
                <SvgText y={1.2 * k} fontSize={2.4 * k} textAnchor="middle" fill="#fff" fontWeight="bold">
                  {hh.number.replace('HH-', '')}
                </SvgText>
                <SvgText
                  y={6.5 * k}
                  fontSize={2 * k}
                  textAnchor="middle"
                  fill="#2d2418"
                  fontWeight="bold"
                  stroke="rgba(255,253,249,0.85)"
                  strokeWidth={0.7 * k}
                >
                  {hh.headName.split(' ')[0]}
                </SvgText>
              </G>
            );
          })}
        </Svg>

        <View style={styles.countPill}>
          <Text style={styles.countPillText}>
            Showing {filtered.length} of {HOUSEHOLDS.length}
            {zoom > 1 ? ` · ${zoom.toFixed(1)}x` : ''}
          </Text>
        </View>

        <View style={styles.zoomControls}>
          <Pressable style={styles.zoomBtn} onPress={() => zoomBy(1.5)} disabled={zoom >= 4}>
            <Text style={styles.zoomBtnText}>+</Text>
          </Pressable>
          <Pressable style={styles.zoomBtn} onPress={() => zoomBy(1 / 1.5)} disabled={zoom <= 1}>
            <Text style={styles.zoomBtnText}>−</Text>
          </Pressable>
          <Pressable style={styles.zoomBtn} onPress={resetView}>
            <Text style={styles.zoomBtnTextSmall}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Map Legend</Text>
          <LegendRow color={PIN_COLOR.critical} label="Critical Emergency" />
          <LegendRow color={PIN_COLOR.high_risk} label="High Risk / Due Visit" />
          <LegendRow color={PIN_COLOR.routine} label="Routine Monitoring" />
          <LegendRow color={PIN_COLOR.visited} label="Visited & Complete" />
        </View>
      </View>

      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selected && (
              <>
                <Text style={styles.modalTitle}>
                  {selected.number} — {selected.headName}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selected.pada}, Paud Village · {selected.membersCount} Family Members
                </Text>

                <Text style={styles.alertsLabel}>Active Health Alerts & Required Actions</Text>
                {selected.alerts.map((a, i) => (
                  <View key={i} style={styles.alertBox}>
                    <Text style={styles.alertText}>{a}</Text>
                  </View>
                ))}

                <View style={styles.detailBox}>
                  <DetailRow label="Scheduled Visit" value="Today, 09:30 AM" />
                  <DetailRow label="Assigned Task" value={selected.dueTask ?? '—'} />
                  <DetailRow label="Primary Contact" value="+91 97654 32109" />
                </View>

                <View style={styles.modalActions}>
                  <Pressable style={styles.closeBtn} onPress={() => setSelected(null)}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </Pressable>
                  <Pressable
                    style={styles.navBtn}
                    onPress={() => {
                      Linking.openURL(`geo:0,0?q=${selected.headName} ${selected.pada} Paud Village`);
                      setSelected(null);
                    }}
                  >
                    <Text style={styles.navBtnText}>Start Navigation</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6', padding: 16 },
  header: { marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  filterPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterPillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  filterPillText: { fontSize: 10, fontWeight: '700', color: '#4B5563' },
  filterPillTextActive: { color: '#fff' },
  mapBox: { flex: 1, backgroundColor: '#ECFDF5', borderRadius: 16, borderWidth: 1, borderColor: '#D1FAE5', overflow: 'hidden', position: 'relative' },
  countPill: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  countPillText: { fontSize: 10, fontWeight: '700', color: '#4B5563' },
  zoomControls: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 4, gap: 4 },
  zoomBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  zoomBtnText: { fontSize: 16, fontWeight: '800', color: '#374151' },
  zoomBtnTextSmall: { fontSize: 8, fontWeight: '800', color: '#374151' },
  legend: { position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 8, gap: 4 },
  legendTitle: { fontSize: 10, fontWeight: '800', color: '#111827', marginBottom: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 9, color: '#4B5563' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  modalSubtitle: { fontSize: 11, color: '#6B7280', marginTop: 2, marginBottom: 14 },
  alertsLabel: { fontSize: 10, fontWeight: '800', color: '#92400E', textTransform: 'uppercase', marginBottom: 8 },
  alertBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 10, padding: 10, marginBottom: 8 },
  alertText: { fontSize: 12, color: '#92400E', fontWeight: '600' },
  detailBox: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, marginTop: 6, gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 11, color: '#6B7280' },
  detailValue: { fontSize: 11, fontWeight: '700', color: '#111827' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  closeBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  closeBtnText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  navBtn: { backgroundColor: '#15803D', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  navBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
