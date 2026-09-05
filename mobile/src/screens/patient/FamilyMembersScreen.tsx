import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { backendApi, FamilyMemberRecord } from '@arogyasetu/shared/services/api';
import { dataService } from '../../services/api/dataService';
import type { PatientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PatientStackParamList, 'FamilyMembers'>;

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Grandchild', 'Other'];

/**
 * Mirrors frontend/src/pages/patient/FamilyMembers.tsx, but reads and writes
 * the real /api/patients/:id/family endpoint (already implemented in
 * patientController.js/patientService.js, just not consumed by any UI yet)
 * instead of the web version's client-only MOCK_FAMILY array. Drops the
 * hardcoded "Ration Card ID" banner and the client-generated fake ABHA ID
 * fallback — the server does not return either, so nothing is invented here.
 */
export function FamilyMembersScreen(_props: Props) {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('Child');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const patients = await dataService.getPatients();
      const me = patients[0];
      if (!me) {
        setError('No health record is linked to this account yet.');
        return;
      }
      setPatientId(me.id);
      const rows = await backendApi.getFamilyMembers(me.id);
      setMembers(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load family members.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddMember = async () => {
    if (!patientId || !newName.trim()) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await backendApi.addFamilyMember(patientId, { name: newName.trim(), relationship: newRelationship });
      setShowAddModal(false);
      setNewName('');
      setNewRelationship('Child');
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not link this family member.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.headerSubtitle}>Manage health records for household members</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addBtnText}>+ Link Member</Text>
        </Pressable>
      </View>

      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#7C3AED" />
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!isLoading && !error && (
        <ScrollView style={styles.list}>
          {members.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No family members linked yet</Text>
              <Text style={styles.emptyHint}>Link a household member's ABHA to manage their care from here.</Text>
            </View>
          ) : (
            members.map((mem) => (
              <View key={mem.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.memberName}>{mem.name ?? 'Unnamed'}</Text>
                  <Text style={styles.relationBadge}>{mem.relationship}</Text>
                </View>
                {mem.dateOfBirth || mem.gender ? (
                  <Text style={styles.memberMeta}>
                    {mem.gender ? mem.gender : ''}
                    {mem.dateOfBirth ? `${mem.gender ? ' · ' : ''}DOB: ${mem.dateOfBirth}` : ''}
                  </Text>
                ) : null}
                {mem.relatedPatientId ? (
                  <Text style={styles.linkedBadge}>✓ Linked to a registered patient record</Text>
                ) : (
                  <Text style={styles.unlinkedBadge}>Not yet linked to an ABHA record</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Link Household Member</Text>

            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Rohini Patil"
            />

            <Text style={styles.fieldLabel}>Relationship</Text>
            <View style={styles.relRow}>
              {RELATIONSHIPS.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.relPill, newRelationship === r && styles.relPillActive]}
                  onPress={() => setNewRelationship(r)}
                >
                  <Text style={[styles.relPillText, newRelationship === r && styles.relPillTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>

            {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

            <Pressable
              style={[styles.submitBtn, (isSaving || !newName.trim()) && styles.btnDisabled]}
              onPress={handleAddMember}
              disabled={isSaving || !newName.trim()}
            >
              <Text style={styles.submitBtnText}>{isSaving ? 'Linking…' : 'Link Member'}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  headerSubtitle: { fontSize: 12, color: '#6B7280', flex: 1, marginRight: 10 },
  addBtn: { backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  loadingRow: { paddingVertical: 40, alignItems: 'center' },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 14, marginHorizontal: 16 },
  errorText: { fontSize: 12, color: '#991B1B' },
  list: { flex: 1, paddingHorizontal: 16 },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#4B5563' },
  emptyHint: { fontSize: 12, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  relationBadge: { fontSize: 10, fontWeight: '700', color: '#7C3AED', backgroundColor: '#F3E8FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  memberMeta: { fontSize: 11, color: '#6B7280', marginTop: 6 },
  linkedBadge: { fontSize: 10, color: '#059669', marginTop: 8, fontWeight: '600' },
  unlinkedBadge: { fontSize: 10, color: '#9CA3AF', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  relRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  relPillActive: { backgroundColor: '#7C3AED' },
  relPillText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  relPillTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
});
