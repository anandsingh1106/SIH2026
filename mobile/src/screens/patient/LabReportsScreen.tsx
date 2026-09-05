import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import type { LabOrder } from '@arogyasetu/shared/types';
import type { PatientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PatientStackParamList, 'LabReports'>;

function getTrend(isAbnormal?: boolean): { icon: string; label: string } {
  if (isAbnormal === true) return { icon: '↑', label: 'Abnormal' };
  if (isAbnormal === false) return { icon: '↓', label: 'Normal' };
  return { icon: '–', label: 'Pending' };
}

/**
 * Mirrors frontend/src/pages/patient/LabReports.tsx. Drops the "Download
 * Report" action — there is no report-file endpoint on either platform.
 */
export function LabReportsScreen(_props: Props) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    dataService
      .getLabOrders()
      .then((rows) => {
        if (!cancelled) setOrders(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => ['all', ...Array.from(new Set(orders.map((o) => o.category)))], [orders]);
  const filtered = selectedCategory === 'all' ? orders : orders.filter((o) => o.category === selectedCategory);

  return (
    <View style={styles.screen}>
      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>
          Lab results shown here are for informational purposes. Always consult your doctor to
          interpret results in the context of your clinical condition.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {categories.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.filterPill, selectedCategory === cat && styles.filterPillActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.filterPillText, selectedCategory === cat && styles.filterPillTextActive]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.list}>
        {loading && <Text style={styles.emptyText}>Loading your lab reports…</Text>}
        {!loading && filtered.length === 0 && <Text style={styles.emptyText}>No lab reports in this category</Text>}

        {filtered.map((order) => {
          const trend = getTrend(order.isAbnormal);
          const isCompleted = order.status === 'completed';
          return (
            <View key={order.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={styles.testName}>
                    {order.testName}
                    {order.isAbnormal ? ' ⚠' : ''}
                  </Text>
                  <Text style={styles.metaText}>{order.category} · {order.doctorName} · {order.facilityName}</Text>
                  <Text style={styles.metaText}>Ordered: {order.dateOrdered}</Text>
                </View>
                <View style={styles.badgeCol}>
                  <Text
                    style={[
                      styles.statusBadge,
                      order.status === 'completed'
                        ? styles.statusCompleted
                        : order.status === 'processing'
                        ? styles.statusProcessing
                        : styles.statusOrdered,
                    ]}
                  >
                    {order.status.replace('_', ' ')}
                  </Text>
                  <Text
                    style={[
                      styles.priorityBadge,
                      order.priority === 'critical'
                        ? styles.priorityCritical
                        : order.priority === 'high'
                        ? styles.priorityHigh
                        : styles.priorityDefault,
                    ]}
                  >
                    {order.priority}
                  </Text>
                </View>
              </View>

              {isCompleted && order.result && (
                <View style={styles.resultBox}>
                  <View style={styles.resultGrid}>
                    <View style={styles.resultCol}>
                      <Text style={styles.resultLabel}>Result</Text>
                      <Text style={[styles.resultValue, order.isAbnormal ? styles.resultAbnormal : styles.resultNormal]}>
                        {order.result}{order.unit ? ` ${order.unit}` : ''}
                      </Text>
                    </View>
                    {order.referenceRange ? (
                      <View style={styles.resultCol}>
                        <Text style={styles.resultLabel}>Reference Range</Text>
                        <Text style={styles.resultMeta}>{order.referenceRange}</Text>
                      </View>
                    ) : null}
                    <View style={styles.resultCol}>
                      <Text style={styles.resultLabel}>Interpretation</Text>
                      <Text style={[styles.resultValue, order.isAbnormal ? styles.resultAbnormal : styles.resultNormal]}>
                        {trend.icon} {trend.label}
                      </Text>
                    </View>
                    {order.completedDate ? (
                      <View style={styles.resultCol}>
                        <Text style={styles.resultLabel}>Report Date</Text>
                        <Text style={styles.resultMeta}>{order.completedDate}</Text>
                      </View>
                    ) : null}
                  </View>
                  {order.notes ? (
                    <Text style={styles.notesText}>
                      <Text style={styles.notesLabel}>Lab Notes: </Text>
                      {order.notes}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  noticeBox: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, padding: 12, marginHorizontal: 16, marginTop: 12 },
  noticeText: { fontSize: 11, color: '#1E3A8A', lineHeight: 16 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 0 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterPillActive: { backgroundColor: '#15803D' },
  filterPillText: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'capitalize' },
  filterPillTextActive: { color: '#fff' },
  list: { flex: 1, paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 12 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLeft: { flex: 1 },
  testName: { fontSize: 13, fontWeight: '800', color: '#111827' },
  metaText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  badgeCol: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, textTransform: 'capitalize' },
  statusCompleted: { backgroundColor: '#D1FAE5', color: '#065F46' },
  statusProcessing: { backgroundColor: '#FEF3C7', color: '#92400E' },
  statusOrdered: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  priorityBadge: { fontSize: 9, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, textTransform: 'capitalize' },
  priorityCritical: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  priorityHigh: { backgroundColor: '#FEF3C7', color: '#92400E' },
  priorityDefault: { backgroundColor: '#F3F4F6', color: '#4B5563' },
  resultBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  resultCol: { minWidth: '40%' },
  resultLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  resultValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  resultAbnormal: { color: '#DC2626' },
  resultNormal: { color: '#16A34A' },
  resultMeta: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 2 },
  notesText: { fontSize: 11, color: '#6B7280', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  notesLabel: { fontWeight: '700', color: '#374151' },
});
