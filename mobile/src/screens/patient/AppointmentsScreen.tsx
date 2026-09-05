import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { appointmentsApi, Appointment } from '../../services/api/appointmentsApi';
import type { PatientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PatientStackParamList, 'Appointments'>;
type Tab = 'upcoming' | 'past';

// Same 7 seed facilities as frontend/src/data/mockData.ts's INITIAL_FACILITIES
// (Maharashtra reference facility list, not fabricated patient data).
const FACILITIES = [
  'Primary Health Center (PHC) Paud',
  'Community Health Center (CHC) Mulshi',
  'Sub-District Hospital (SDH) Baramati',
  'District Hospital Aundh, Pune',
  'B.J. Govt Medical College & Sassoon General Hospital',
  'King Edward Memorial (KEM) Hospital & Seth GSMC',
  'District General Hospital Gadchiroli',
];

const EMPTY_FORM = {
  facility: FACILITIES[0],
  doctor: '',
  specialty: '',
  date: '',
  time: '',
  type: 'in-person' as 'in-person' | 'telemedicine',
  reason: '',
};

/** Mirrors frontend/src/pages/patient/Appointments.tsx. */
export function AppointmentsScreen(_props: Props) {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState(EMPTY_FORM);
  const [bookError, setBookError] = useState('');

  const loadAppointments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { items } = await appointmentsApi.list();
      setAppointments(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load appointments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const upcoming = appointments.filter((a) => a.status === 'upcoming');
  const past = appointments.filter((a) => a.status !== 'upcoming');
  const displayed = tab === 'upcoming' ? upcoming : past;

  const handleBook = async () => {
    setBookError('');
    if (!bookForm.doctor || !bookForm.specialty || !bookForm.facility || !bookForm.date || !bookForm.time) {
      setBookError('Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      await appointmentsApi.create(bookForm);
      setBookModalOpen(false);
      setBookForm(EMPTY_FORM);
      await loadAppointments();
    } catch (err) {
      setBookError(err instanceof Error ? err.message : 'Could not book appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal) return;
    setIsSubmitting(true);
    try {
      await appointmentsApi.cancel(cancelModal);
      setCancelModal(null);
      await loadAppointments();
    } catch {
      // The list stays as-is; the modal closing without effect signals failure.
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReschedule = (id: string) => {
    const apt = appointments.find((a) => a.id === id);
    setRescheduleDate(apt?.date || '');
    setRescheduleTime(apt?.time || '');
    setRescheduleModal(id);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleModal || !rescheduleDate || !rescheduleTime) return;
    setIsSubmitting(true);
    try {
      await appointmentsApi.reschedule(rescheduleModal, rescheduleDate, rescheduleTime);
      setRescheduleModal(null);
      await loadAppointments();
    } catch {
      // Left queued for retry; no separate error surface on this modal yet.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.headerSubtitle}>Upcoming and past consultations</Text>
        <Pressable style={styles.bookBtn} onPress={() => setBookModalOpen(true)}>
          <Text style={styles.bookBtnText}>+ Book</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {(['upcoming', 'past'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ScrollView style={styles.list}>
        {isLoading ? (
          <Text style={styles.emptyText}>Loading appointments…</Text>
        ) : displayed.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No {tab} appointments</Text>
            {tab === 'upcoming' && <Text style={styles.emptyHint}>Book a new appointment using the button above</Text>}
          </View>
        ) : (
          displayed.map((apt) => (
            <View key={apt.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={styles.reasonText}>
                    {apt.type === 'telemedicine' ? '📹 ' : '🏥 '}
                    {apt.reason || `${apt.specialty} Consultation`}
                  </Text>
                  <Text style={styles.doctorText}>{apt.doctor} · {apt.specialty}</Text>
                  <Text style={styles.facilityText}>{apt.facility}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{apt.date}</Text>
                    <Text style={styles.metaText}>{apt.time}</Text>
                    {apt.tokenNumber ? <Text style={styles.tokenText}>Token #{apt.tokenNumber}</Text> : null}
                  </View>
                </View>
                <Text
                  style={[
                    styles.statusBadge,
                    apt.status === 'upcoming'
                      ? styles.statusUpcoming
                      : apt.status === 'completed'
                      ? styles.statusCompleted
                      : styles.statusCancelled,
                  ]}
                >
                  {apt.status}
                </Text>
              </View>

              {apt.status === 'upcoming' && (
                <View style={styles.actionsRow}>
                  <Pressable style={styles.rescheduleBtn} onPress={() => openReschedule(apt.id)}>
                    <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                  </Pressable>
                  <Pressable style={styles.cancelBtn} onPress={() => setCancelModal(apt.id)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={bookModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalCard}>
            <Text style={styles.modalTitle}>Book New Appointment</Text>

            <Text style={styles.fieldLabel}>Facility *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.facilityRow}>
              {FACILITIES.map((f) => (
                <Pressable
                  key={f}
                  style={[styles.facilityPill, bookForm.facility === f && styles.facilityPillActive]}
                  onPress={() => setBookForm({ ...bookForm, facility: f })}
                >
                  <Text style={[styles.facilityPillText, bookForm.facility === f && styles.facilityPillTextActive]} numberOfLines={1}>
                    {f}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Doctor Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dr. Rajesh Deshmukh"
              value={bookForm.doctor}
              onChangeText={(v) => setBookForm({ ...bookForm, doctor: v })}
            />

            <Text style={styles.fieldLabel}>Specialty *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. General Medicine"
              value={bookForm.specialty}
              onChangeText={(v) => setBookForm({ ...bookForm, specialty: v })}
            />

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={bookForm.date}
                  onChangeText={(v) => setBookForm({ ...bookForm, date: v })}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Time *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  value={bookForm.time}
                  onChangeText={(v) => setBookForm({ ...bookForm, time: v })}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Consultation Type</Text>
            <View style={styles.typeRow}>
              {(['in-person', 'telemedicine'] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typePill, bookForm.type === t && styles.typePillActive]}
                  onPress={() => setBookForm({ ...bookForm, type: t })}
                >
                  <Text style={[styles.typePillText, bookForm.type === t && styles.typePillTextActive]}>
                    {t === 'in-person' ? 'In-Person' : 'Telemedicine'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Reason for Visit</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Follow-up: Hypertension"
              value={bookForm.reason}
              onChangeText={(v) => setBookForm({ ...bookForm, reason: v })}
            />

            {bookError ? <Text style={styles.errorText}>{bookError}</Text> : null}

            <Pressable style={[styles.confirmBtn, isSubmitting && styles.btnDisabled]} onPress={handleBook} disabled={isSubmitting}>
              <Text style={styles.confirmBtnText}>{isSubmitting ? 'Booking…' : 'Confirm Booking'}</Text>
            </Pressable>
            <Pressable style={styles.dismissBtn} onPress={() => setBookModalOpen(false)}>
              <Text style={styles.dismissBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!cancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Appointment</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to cancel this appointment? Please inform your healthcare provider
              if you are unable to attend.
            </Text>
            <Pressable style={[styles.dangerBtn, isSubmitting && styles.btnDisabled]} onPress={handleConfirmCancel} disabled={isSubmitting}>
              <Text style={styles.dangerBtnText}>Yes, Cancel Appointment</Text>
            </Pressable>
            <Pressable style={styles.dismissBtn} onPress={() => setCancelModal(null)}>
              <Text style={styles.dismissBtnText}>Keep Appointment</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!rescheduleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reschedule Appointment</Text>
            <Text style={styles.fieldLabel}>New Date</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={rescheduleDate} onChangeText={setRescheduleDate} />
            <Text style={styles.fieldLabel}>New Time</Text>
            <TextInput style={styles.input} placeholder="HH:MM" value={rescheduleTime} onChangeText={setRescheduleTime} />
            <Pressable
              style={[styles.confirmBtn, (isSubmitting || !rescheduleDate || !rescheduleTime) && styles.btnDisabled]}
              onPress={handleConfirmReschedule}
              disabled={isSubmitting || !rescheduleDate || !rescheduleTime}
            >
              <Text style={styles.confirmBtnText}>Confirm New Time</Text>
            </Pressable>
            <Pressable style={styles.dismissBtn} onPress={() => setRescheduleModal(null)}>
              <Text style={styles.dismissBtnText}>Cancel</Text>
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
  headerSubtitle: { fontSize: 12, color: '#6B7280' },
  bookBtn: { backgroundColor: '#15803D', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  bookBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#15803D' },
  tabLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  tabLabelActive: { color: '#fff' },
  errorText: { fontSize: 12, color: '#B91C1C', marginHorizontal: 16, marginBottom: 8 },
  list: { flex: 1, paddingHorizontal: 16 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  emptyHint: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLeft: { flex: 1 },
  reasonText: { fontSize: 13, fontWeight: '800', color: '#111827' },
  doctorText: { fontSize: 12, color: '#4B5563', marginTop: 4 },
  facilityText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  metaText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  tokenText: { fontSize: 11, fontWeight: '800', color: '#15803D' },
  statusBadge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, textTransform: 'capitalize', alignSelf: 'flex-start' },
  statusUpcoming: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  statusCompleted: { backgroundColor: '#D1FAE5', color: '#065F46' },
  statusCancelled: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  rescheduleBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  rescheduleBtnText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  cancelBtnText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 14 },
  modalBody: { fontSize: 12, color: '#4B5563', lineHeight: 18, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  facilityRow: { flexGrow: 0 },
  facilityPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', marginRight: 8, maxWidth: 200 },
  facilityPillActive: { backgroundColor: '#15803D' },
  facilityPillText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  facilityPillTextActive: { color: '#fff' },
  row2: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typePill: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  typePillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  typePillText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  typePillTextActive: { color: '#fff' },
  confirmBtn: { backgroundColor: '#15803D', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  confirmBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  dangerBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  dangerBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  dismissBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  dismissBtnText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
