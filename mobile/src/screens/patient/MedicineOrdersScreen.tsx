import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import type { MedicineAvailability, MedicineOrder, Prescription } from '@arogyasetu/shared/types';
import type { PatientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PatientStackParamList, 'MedicineOrders'>;

/** Mirrors frontend/src/pages/patient/MedicineOrders.tsx. */
export function MedicineOrdersScreen(_props: Props) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [availability, setAvailability] = useState<MedicineAvailability[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [order, setOrder] = useState<MedicineOrder | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dataService
      .getPrescriptions()
      .then((list) => {
        setPrescriptions(list);
        if (list.length > 0) setSelectedRx(list[0]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedRx) return;
    setIsLoadingStock(true);
    setOrder(null);
    setError('');

    dataService
      .getPrescriptionAvailability(selectedRx.id)
      .then((rows) => {
        setAvailability(rows);
        setChecked(Object.fromEntries(rows.map((r) => [r.medicineName, r.available])));
      })
      .finally(() => setIsLoadingStock(false));
  }, [selectedRx]);

  const selectedItems = useMemo(
    () => availability.filter((a) => a.available && checked[a.medicineName]),
    [availability, checked]
  );

  const totalCost = useMemo(
    () => selectedItems.reduce((sum, a) => sum + (a.estimatedCost ?? 0), 0),
    [selectedItems]
  );

  const handleOrder = async () => {
    if (!selectedRx || selectedItems.length === 0) return;
    setIsOrdering(true);
    setError('');
    try {
      const placed = await dataService.orderMedicines(
        selectedRx.id,
        selectedItems.map((a) => ({ medicineName: a.medicineName, quantity: a.quantity || 1 })),
        selectedItems[0]?.facilityId ?? undefined
      );
      setOrder(placed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place the order. Please try again.');
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <ScrollView style={styles.screen}>
      {order && (
        <View style={styles.receiptBox}>
          <Text style={styles.receiptTitle}>Order placed successfully</Text>
          <Text style={styles.receiptText}>
            Show this token at the pharmacy counter to collect {order.items.length}{' '}
            {order.items.length === 1 ? 'medicine' : 'medicines'}.
          </Text>
          <Text style={styles.receiptTokenLabel}>COLLECTION TOKEN</Text>
          <Text style={styles.receiptToken}>{order.orderCode}</Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isLoading && <Text style={styles.emptyText}>Loading your prescriptions…</Text>}

      {!isLoading && prescriptions.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No prescriptions yet</Text>
          <Text style={styles.emptyHint}>
            Medicines you are prescribed during a consultation will appear here for ordering.
          </Text>
        </View>
      )}

      {!isLoading && prescriptions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Your Prescriptions ({prescriptions.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rxRow}>
            {prescriptions.map((rx) => {
              const active = selectedRx?.id === rx.id;
              return (
                <Pressable
                  key={rx.id}
                  style={[styles.rxCard, active && styles.rxCardActive]}
                  onPress={() => setSelectedRx(rx)}
                >
                  <Text style={styles.rxDoctor}>{rx.doctorName || 'Prescription'}</Text>
                  <Text style={styles.rxMeta}>{(rx.medicines ?? []).length} med · {rx.date || '—'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.medCard}>
            <View style={styles.medCardHeader}>
              <Text style={styles.medCardTitle}>Medicines on this prescription</Text>
              {selectedRx?.facilityName ? <Text style={styles.medCardFacility}>{selectedRx.facilityName}</Text> : null}
            </View>

            {isLoadingStock && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#15803D" />
                <Text style={styles.loadingText}>Checking pharmacy stock…</Text>
              </View>
            )}

            {!isLoadingStock && availability.length === 0 && (
              <Text style={styles.emptyText}>No medicines were recorded on this prescription.</Text>
            )}

            {!isLoadingStock &&
              availability.map((a) => (
                <Pressable
                  key={a.medicineName}
                  style={[styles.medRow, !a.available && styles.medRowDisabled]}
                  disabled={!a.available}
                  onPress={() =>
                    setChecked((prev) => ({ ...prev, [a.medicineName]: !prev[a.medicineName] }))
                  }
                >
                  <View style={[styles.checkbox, checked[a.medicineName] && styles.checkboxChecked]}>
                    {checked[a.medicineName] ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <View style={styles.medRowBody}>
                    <View style={styles.medRowTop}>
                      <Text style={styles.medRowName}>{a.medicineName}</Text>
                      <Text style={a.available ? styles.stockBadgeIn : styles.stockBadgeOut}>
                        {a.available ? `IN STOCK (${a.inStock})` : 'OUT OF STOCK'}
                      </Text>
                    </View>
                    <Text style={styles.medRowDetail}>
                      {[a.dosage, a.frequency, a.duration].filter(Boolean).join(' • ') || '—'}
                    </Text>
                    <View style={styles.medRowMetaRow}>
                      <Text style={styles.medRowQty}>Qty: {a.quantity || 1}</Text>
                      {a.unitPrice != null && <Text style={styles.medRowPrice}>₹{a.unitPrice}/unit</Text>}
                      {a.estimatedCost != null && <Text style={styles.medRowCost}>₹{a.estimatedCost}</Text>}
                    </View>
                    {!a.available && (
                      <Text style={styles.unavailableText}>
                        Not available at any pharmacy right now. Please ask your ASHA worker.
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}

            {!isLoadingStock && availability.length > 0 && (
              <View style={styles.orderBar}>
                <View>
                  <Text style={styles.selectedText}>
                    {selectedItems.length} of {availability.length} selected
                  </Text>
                  {totalCost > 0 && <Text style={styles.totalText}>Total: ₹{totalCost.toFixed(2)}</Text>}
                </View>
                <Pressable
                  style={[styles.orderBtn, (selectedItems.length === 0 || isOrdering) && styles.btnDisabled]}
                  onPress={handleOrder}
                  disabled={selectedItems.length === 0 || isOrdering}
                >
                  <Text style={styles.orderBtnText}>{isOrdering ? 'Placing order…' : 'Place Order'}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6', padding: 16 },
  receiptBox: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 16, padding: 16, marginBottom: 14 },
  receiptTitle: { fontSize: 13, fontWeight: '800', color: '#065F46' },
  receiptText: { fontSize: 11, color: '#047857', marginTop: 4 },
  receiptTokenLabel: { fontSize: 10, fontWeight: '700', color: '#059669', marginTop: 10, textTransform: 'uppercase' },
  receiptToken: { fontSize: 20, fontWeight: '800', color: '#065F46', fontFamily: 'monospace', marginTop: 2 },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, padding: 14, marginBottom: 14 },
  errorText: { fontSize: 12, fontWeight: '700', color: '#991B1B' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 12 },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#4B5563' },
  emptyHint: { fontSize: 12, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#374151', textTransform: 'uppercase', marginBottom: 8 },
  rxRow: { flexGrow: 0, marginBottom: 16 },
  rxCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginRight: 10, minWidth: 160 },
  rxCardActive: { borderColor: '#15803D', backgroundColor: '#F0FDF4' },
  rxDoctor: { fontSize: 12, fontWeight: '800', color: '#111827' },
  rxMeta: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  medCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16 },
  medCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 10, marginBottom: 10 },
  medCardTitle: { fontSize: 13, fontWeight: '800', color: '#111827' },
  medCardFacility: { fontSize: 10, color: '#9CA3AF' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 12, color: '#6B7280' },
  medRow: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  medRowDisabled: { backgroundColor: '#F9FAFB', opacity: 0.75 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: '#15803D', borderColor: '#15803D' },
  checkboxMark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  medRowBody: { flex: 1 },
  medRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  medRowName: { fontSize: 13, fontWeight: '800', color: '#111827' },
  stockBadgeIn: { fontSize: 9, fontWeight: '800', color: '#065F46', backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  stockBadgeOut: { fontSize: 9, fontWeight: '800', color: '#991B1B', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  medRowDetail: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  medRowMetaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  medRowQty: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  medRowPrice: { fontSize: 11, color: '#6B7280' },
  medRowCost: { fontSize: 11, fontWeight: '800', color: '#134E4A' },
  unavailableText: { fontSize: 11, color: '#DC2626', marginTop: 6 },
  orderBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 14, marginTop: 6 },
  selectedText: { fontSize: 11, color: '#6B7280' },
  totalText: { fontSize: 12, fontWeight: '800', color: '#111827', marginTop: 2 },
  orderBtn: { backgroundColor: '#15803D', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  orderBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
});
