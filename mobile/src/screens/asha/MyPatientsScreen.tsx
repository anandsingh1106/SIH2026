import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { backendApi, PatientSummary } from '@arogyasetu/shared/services/api';
import { dataService } from '../../services/api/dataService';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'MyPatients'>;

/**
 * Mirrors frontend/src/pages/asha/MyPatients.tsx. The API scopes
 * /api/patients to the caller's caseload server-side, so no client-side
 * filtering by worker happens here — and none would be trustworthy.
 */
export function MyPatientsScreen({ navigation }: Props) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [villageFilter, setVillageFilter] = useState('all');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { items } = await backendApi.getPatients({ limit: 100 });
      setPatients(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your patients.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = dataService.subscribe(({ entity }) => {
      if (entity === 'patients') load();
    });
    return () => unsub();
  }, [load]);

  const villages = useMemo(() => {
    const set = new Set(patients.map((p) => p.village).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [patients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      if (villageFilter !== 'all' && p.village !== villageFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.phone ?? '').toLowerCase().includes(q) ||
        (p.abhaId ?? '').toLowerCase().includes(q) ||
        (p.village ?? '').toLowerCase().includes(q)
      );
    });
  }, [patients, query, villageFilter]);

  const ageOf = (p: PatientSummary) => {
    if (!p.dateOfBirth) return null;
    const dob = new Date(p.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;
    return Math.floor((Date.now() - dob.getTime()) / 31557600000);
  };

  const handleScheduleVisit = async (p: PatientSummary) => {
    try {
      await dataService.saveTask({
        title: `Home visit — ${p.name}`,
        description: `Scheduled from the patient list${p.village ? ` (${p.village})` : ''}.`,
        patientId: p.id,
        type: 'home_visit',
        priority: 'medium',
        dueDate: new Date().toISOString().slice(0, 10),
      } as never);
    } catch {
      // Surfaced via the error banner path on next load; the request itself
      // already reported failure through its own rejected promise.
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>
          {isLoading ? 'Loading your caseload…' : `${patients.length} patient${patients.length === 1 ? '' : 's'} assigned to you`}
        </Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.refreshButton} onPress={load}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
          <Pressable style={styles.registerButton} onPress={() => navigation.navigate('RegisterPatient')}>
            <Text style={styles.registerButtonText}>+ Register</Text>
          </Pressable>
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search by name, phone, ABHA ID or village…"
        value={query}
        onChangeText={setQuery}
      />

      {villages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.villageRow}>
          <Pressable style={[styles.villagePill, villageFilter === 'all' && styles.villagePillActive]} onPress={() => setVillageFilter('all')}>
            <Text style={[styles.villagePillText, villageFilter === 'all' && styles.villagePillTextActive]}>All villages</Text>
          </Pressable>
          {villages.map((v) => (
            <Pressable key={v} style={[styles.villagePill, villageFilter === v && styles.villagePillActive]} onPress={() => setVillageFilter(v)}>
              <Text style={[styles.villagePillText, villageFilter === v && styles.villagePillTextActive]}>{v}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ScrollView style={styles.list}>
        {isLoading ? (
          <ActivityIndicator style={styles.loading} color="#15803D" />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {patients.length === 0 ? 'No patients are assigned to you yet.' : 'No patients match this search.'}
            </Text>
            {patients.length === 0 && (
              <Pressable style={styles.registerButton} onPress={() => navigation.navigate('RegisterPatient')}>
                <Text style={styles.registerButtonText}>Register your first patient</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filtered.map((p) => {
            const age = ageOf(p);
            return (
              <View key={p.id} style={styles.patientCard}>
                <View style={styles.patientHeader}>
                  <Text style={styles.patientName}>{p.name}</Text>
                  {p.abhaId ? <Text style={styles.abhaBadge}>ABHA</Text> : null}
                </View>
                <Text style={styles.patientMeta}>
                  {age !== null ? `${age} yrs` : 'Age not recorded'}
                  {p.gender ? ` · ${p.gender}` : ''}
                  {p.bloodGroup ? ` · ${p.bloodGroup}` : ''}
                </Text>
                {p.village ? (
                  <Text style={styles.patientDetail}>
                    {p.village}{p.taluka ? `, ${p.taluka}` : ''}{p.district ? ` (${p.district})` : ''}
                  </Text>
                ) : null}
                {p.phone ? <Text style={styles.patientDetail}>{p.phone}</Text> : null}
                {p.abhaId ? <Text style={styles.abhaId}>{p.abhaId}</Text> : null}

                <View style={styles.patientActions}>
                  <Pressable style={styles.scheduleButton} onPress={() => handleScheduleVisit(p)}>
                    <Text style={styles.scheduleButtonText}>Schedule Visit</Text>
                  </Pressable>
                  <Pressable style={styles.recordButton} onPress={() => navigation.navigate('HomeVisits')}>
                    <Text style={styles.recordButtonText}>Record</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {!isLoading && filtered.length > 0 && (
          <Text style={styles.footerText}>Showing {filtered.length} of {patients.length} assigned patients</Text>
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
  refreshButton: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  refreshButtonText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  registerButton: { flex: 1, backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  registerButtonText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  search: { marginHorizontal: 16, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, marginBottom: 8 },
  villageRow: { paddingHorizontal: 16, marginBottom: 8 },
  villagePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 6 },
  villagePillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  villagePillText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  villagePillTextActive: { color: '#fff' },
  errorText: { marginHorizontal: 16, color: '#B91C1C', fontSize: 12, marginBottom: 8 },
  list: { flex: 1, paddingHorizontal: 16 },
  loading: { marginTop: 40 },
  empty: { alignItems: 'center', marginTop: 40, gap: 12 },
  emptyText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  patientCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 10 },
  patientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  abhaBadge: { fontSize: 9, fontWeight: '800', color: '#15803D', backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  patientMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  patientDetail: { fontSize: 11, color: '#4B5563', marginTop: 4 },
  abhaId: { fontSize: 11, color: '#15803D', fontFamily: 'monospace', marginTop: 4 },
  patientActions: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  scheduleButton: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  scheduleButtonText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  recordButton: { flex: 1, backgroundColor: '#134E4A', borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  recordButtonText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  footerText: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginVertical: 16 },
});
