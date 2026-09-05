import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput, Linking } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import type { Patient, Vaccination } from '@arogyasetu/shared/types';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'Immunization'>;
type Tab = 'due' | 'completed' | 'all';

interface LedgerRow extends Vaccination {
  patient?: Patient;
}

const STATUS_COLORS: Record<Vaccination['status'], { bg: string; fg: string }> = {
  OVERDUE: { bg: '#FEE2E2', fg: '#991B1B' },
  GIVEN: { bg: '#D1FAE5', fg: '#065F46' },
  DUE: { bg: '#FEF3C7', fg: '#92400E' },
};

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Mirrors frontend/src/pages/asha/Immunization.tsx. */
export function ImmunizationScreen(_props: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('due');
  const [records, setRecords] = useState<Vaccination[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [selected, setSelected] = useState<LedgerRow | null>(null);
  const [batchNo, setBatchNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([dataService.getVaccinations(), dataService.getPatients()])
      .then(([vaccinations, people]) => {
        if (cancelled) return;
        setRecords(vaccinations);
        setPatients(people);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byPatient = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const p of patients) map.set(p.id, p);
    return map;
  }, [patients]);

  const rows: LedgerRow[] = useMemo(
    () => records.map((r) => ({ ...r, patient: byPatient.get(r.patientId) })),
    [records, byPatient]
  );

  const dueCount = useMemo(
    () => rows.filter((r) => r.status === 'DUE' || r.status === 'OVERDUE').length,
    [rows]
  );

  const filtered = useMemo(() => {
    const list =
      activeTab === 'due'
        ? rows.filter((r) => r.status === 'DUE' || r.status === 'OVERDUE')
        : activeTab === 'completed'
        ? rows.filter((r) => r.status === 'GIVEN')
        : rows;

    return [...list].sort((a, b) => {
      const rank = (s: Vaccination['status']) => (s === 'OVERDUE' ? 0 : s === 'DUE' ? 1 : 2);
      if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
      return (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? '');
    });
  }, [rows, activeTab]);

  const handleAdminister = (row: LedgerRow) => {
    setSelected(row);
    setBatchNo(row.batchNumber ?? '');
    setError(null);
    setIsGiveModalOpen(true);
  };

  const handleConfirmAdminister = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await dataService.administerVaccination(selected.id, {
        batchNumber: batchNo.trim() || undefined,
      });
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setIsGiveModalOpen(false);
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the dose. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.tabs}>
        {(['due', 'completed', 'all'] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'due'
                ? `Due & Overdue${dueCount > 0 ? ` (${dueCount})` : ''}`
                : tab === 'completed'
                ? 'Completed'
                : 'All Records'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.list}>
        {loading && <Text style={styles.emptyText}>Loading immunisation register…</Text>}

        {!loading && filtered.length === 0 && (
          <Text style={styles.emptyText}>
            {records.length === 0
              ? 'No immunisation records found for your patients.'
              : 'Nothing in this tab right now.'}
          </Text>
        )}

        {filtered.map((r) => {
          const given = r.status === 'GIVEN';
          const colors = STATUS_COLORS[r.status];
          return (
            <View
              key={r.id}
              style={[
                styles.card,
                r.status === 'OVERDUE' && styles.cardOverdue,
                given && styles.cardGiven,
              ]}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.statusBadge, { backgroundColor: colors.bg, color: colors.fg }]}>
                  {r.status}
                </Text>
                <Text style={styles.patientName}>
                  {r.patientName ?? r.patient?.name ?? 'Unknown patient'}
                </Text>
                {r.patient && (
                  <Text style={styles.patientMeta}>
                    ({r.patient.gender?.toUpperCase()}
                    {r.patient.age != null ? `, ${r.patient.age} yrs` : ''})
                  </Text>
                )}
              </View>

              <Text style={styles.vaccineName}>
                {r.name}
                {r.dose ? ` — ${r.dose}` : ''}
              </Text>

              <View style={styles.metaRow}>
                {r.patient?.village && <Text style={styles.metaText}>{r.patient.village} • </Text>}
                <Text style={styles.metaText}>Scheduled: {formatDate(r.scheduledDate)}</Text>
                {r.administeredDate && (
                  <Text style={styles.metaGiven}> • Given: {formatDate(r.administeredDate)}</Text>
                )}
                {r.batchNumber && <Text style={styles.metaText}> • Batch {r.batchNumber}</Text>}
              </View>

              {!given ? (
                <View style={styles.actionsRow}>
                  <Pressable style={styles.primaryBtn} onPress={() => handleAdminister(r)}>
                    <Text style={styles.primaryBtnText}>Record Dose Given</Text>
                  </Pressable>
                  {r.patient?.phone && (
                    <Pressable
                      style={styles.outlineBtn}
                      onPress={() => Linking.openURL(`tel:${r.patient?.phone}`)}
                    >
                      <Text style={styles.outlineBtnText}>Call</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Text style={styles.givenBadge}>Dose Administered & Logged</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={isGiveModalOpen && !!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Record Vaccine: {selected?.patientName ?? selected?.patient?.name ?? ''}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selected?.name}
              {selected?.dose ? ` — ${selected.dose}` : ''}
            </Text>

            <Text style={styles.fieldLabel}>Vaccine Batch Number (from vial)</Text>
            <TextInput style={styles.input} value={batchNo} onChangeText={setBatchNo} />

            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                Confirm the Vaccine Vial Monitor (VVM) is in Stage 1 or 2 before administering, and
                that cold-chain has been maintained for this vial.
              </Text>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setIsGiveModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, saving && styles.btnDisabled]}
                onPress={handleConfirmAdminister}
                disabled={saving}
              >
                <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Confirm & Log'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 4, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#15803D' },
  tabLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  tabLabelActive: { color: '#fff' },
  list: { flex: 1, paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 12 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginBottom: 10 },
  cardOverdue: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  cardGiven: { borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' },
  cardTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  statusBadge: { fontSize: 9, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  patientName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  patientMeta: { fontSize: 11, color: '#6B7280' },
  vaccineName: { fontSize: 12, fontWeight: '700', color: '#134E4A', marginTop: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  metaText: { fontSize: 11, color: '#6B7280' },
  metaGiven: { fontSize: 11, color: '#047857', fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  primaryBtn: { backgroundColor: '#15803D', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  outlineBtn: { borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  outlineBtnText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  givenBadge: { fontSize: 12, fontWeight: '700', color: '#047857', backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 10, alignSelf: 'flex-start' },
  btnDisabled: { opacity: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  modalSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  noteBox: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 10, padding: 10, marginTop: 12 },
  noteText: { fontSize: 11, color: '#1E3A8A', lineHeight: 16 },
  errorText: { fontSize: 12, color: '#B91C1C', marginTop: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  cancelBtnText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
});
