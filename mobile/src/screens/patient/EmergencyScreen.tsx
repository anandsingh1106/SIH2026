import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput, Linking, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { backendApi } from '@arogyasetu/shared/services/api';
import { dataService } from '../../services/api/dataService';
import type { Patient } from '@arogyasetu/shared/types';
import type { PatientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PatientStackParamList, 'Emergency'>;

/**
 * Mirrors frontend/src/pages/patient/Emergency.tsx, but reads the real
 * signed-in patient (allergies, chronic conditions, blood group) instead of
 * INITIAL_PATIENTS[0], and the real patients.emergency_contact /
 * emergency_contact_phone columns (already in the schema, exposed by
 * toPublicPatient, just not editable from any UI yet) instead of the two
 * hardcoded "Ramesh Patil" / "Sunita Patil (ASHA)" cards. Drops the fake
 * dispatched-ambulance ID, ETA and GPS-coordinate readout on SOS trigger —
 * there is no real 108 dispatch integration — and instead has the SOS
 * button place a real phone call to 108, which is something the app can
 * actually do.
 */
export function EmergencyScreen(_props: Props) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const patients = await dataService.getPatients();
      const me = patients[0] ?? null;
      setPatient(me);
      if (me) {
        setContactName(me.emergencyContact?.name ?? '');
        setContactPhone(me.emergencyContact?.phone ?? '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your emergency profile.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveContact = async () => {
    if (!patient) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await backendApi.updatePatient(patient.id, {
        emergencyContact: contactName.trim() || undefined,
        emergencyContactPhone: contactPhone.trim() || undefined,
      });
      setEditModalOpen(false);
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save this contact.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#DC2626" />
      </View>
    );
  }

  if (error || !patient) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>{error || 'No health record is linked to this account yet.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.sosCard}>
        <Text style={styles.sosTag}>🛡 Maharashtra Emergency Medical Services</Text>
        <Text style={styles.sosTitle}>Need Immediate Medical Assistance?</Text>
        <Text style={styles.sosDesc}>
          Call 108 for ambulance dispatch. Have your blood group ready:{' '}
          <Text style={styles.sosBold}>{patient.bloodGroup || 'not recorded'}</Text>.
        </Text>
        <Pressable style={styles.sosBtn} onPress={() => Linking.openURL('tel:108')}>
          <Text style={styles.sosBtnText}>📞 CALL 108 AMBULANCE</Text>
        </Pressable>

        <View style={styles.helplineRow}>
          <Pressable onPress={() => Linking.openURL('tel:108')}>
            <Text style={styles.helplineLink}>Ambulance: 108</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('tel:104')}>
            <Text style={styles.helplineLink}>Health Advice: 104</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('tel:112')}>
            <Text style={styles.helplineLink}>National Emergency: 112</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Emergency Medical Card</Text>
          <Text style={styles.priorityBadge}>High Priority</Text>
        </View>

        <Text style={styles.fieldLabel}>Full Name</Text>
        <Text style={styles.fieldValueBold}>{patient.name}</Text>

        <View style={styles.row2}>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Blood Group</Text>
            <Text style={styles.bloodGroupValue}>{patient.bloodGroup || '—'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Age / Gender</Text>
            <Text style={styles.fieldValue}>{patient.age} yrs / {patient.gender}</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Known Allergies</Text>
        {patient.allergies && patient.allergies.length > 0 ? (
          <View style={styles.chipsRow}>
            {patient.allergies.map((a, i) => (
              <Text key={i} style={styles.allergyChip}>{a}</Text>
            ))}
          </View>
        ) : (
          <Text style={styles.fieldValue}>No documented drug allergies</Text>
        )}

        <Text style={styles.fieldLabel}>Chronic Conditions</Text>
        <Text style={styles.fieldValue}>
          {patient.chronicConditions?.join(', ') || 'None on record'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Emergency Contact</Text>
          <Pressable onPress={() => setEditModalOpen(true)}>
            <Text style={styles.editLink}>Edit</Text>
          </Pressable>
        </View>

        {patient.emergencyContact?.name ? (
          <View style={styles.contactBox}>
            <Text style={styles.contactName}>{patient.emergencyContact.name}</Text>
            {patient.emergencyContact.phone ? (
              <Pressable
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${patient.emergencyContact?.phone}`)}
              >
                <Text style={styles.callBtnText}>Call: {patient.emergencyContact.phone}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Text style={styles.emptyContactText}>
            No emergency contact on file yet. Add one so it's ready when it matters.
          </Text>
        )}
      </View>

      <Modal visible={editModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Emergency Contact</Text>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="e.g. Ramesh Patil" />
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="+91 98000 12345"
              keyboardType="phone-pad"
            />
            {saveError ? <Text style={styles.saveErrorText}>{saveError}</Text> : null}
            <Pressable style={[styles.submitBtn, isSaving && styles.btnDisabled]} onPress={handleSaveContact} disabled={isSaving}>
              <Text style={styles.submitBtnText}>{isSaving ? 'Saving…' : 'Save Contact'}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setEditModalOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6', padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#FAF9F6' },
  centeredText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  sosCard: { backgroundColor: '#DC2626', borderRadius: 20, padding: 20, marginBottom: 16, alignItems: 'center' },
  sosTag: { color: '#FEE2E2', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  sosTitle: { color: '#fff', fontSize: 19, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  sosDesc: { color: '#FEE2E2', fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
  sosBold: { fontWeight: '800', color: '#fff' },
  sosBtn: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, marginTop: 16, borderWidth: 3, borderColor: '#FCA5A5' },
  sosBtnText: { color: '#B91C1C', fontSize: 16, fontWeight: '800' },
  helplineRow: { flexDirection: 'row', gap: 14, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  helplineLink: { color: '#FEE2E2', fontSize: 11, fontWeight: '700', textDecorationLine: 'underline' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderLeftWidth: 4, borderLeftColor: '#DC2626', borderRadius: 14, padding: 16, marginBottom: 14 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#111827' },
  priorityBadge: { fontSize: 9, fontWeight: '800', color: '#991B1B', backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  editLink: { fontSize: 11, fontWeight: '700', color: '#15803D' },
  fieldLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 10, marginBottom: 3 },
  fieldValue: { fontSize: 12, color: '#374151', fontWeight: '600' },
  fieldValueBold: { fontSize: 14, fontWeight: '800', color: '#111827' },
  row2: { flexDirection: 'row', gap: 16, marginTop: 4 },
  col: { flex: 1 },
  bloodGroupValue: { fontSize: 17, fontWeight: '800', color: '#DC2626' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  allergyChip: { fontSize: 11, fontWeight: '700', color: '#B91C1C', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  contactBox: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginTop: 4 },
  contactName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  callBtn: { backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 9, alignItems: 'center', marginTop: 10 },
  callBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyContactText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  saveErrorText: { fontSize: 12, color: '#B91C1C', marginTop: 10 },
  submitBtn: { backgroundColor: '#15803D', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
});
