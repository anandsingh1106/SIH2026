import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import type { Appointment, LabOrder, Patient, Prescription, Referral, Vaccination } from '@arogyasetu/shared/types';
import type { PatientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PatientStackParamList, 'PatientDashboard'>;

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Mirrors frontend/src/pages/patient/Dashboard.tsx. Drops the web version's
 * hardcoded fallback stats (fixed "O+" blood group, fake "Pending Reports: 2"
 * and "Vaccinations Due: 1" metric cards, and the 3-medicine fixture list
 * shown when no prescription exists) — those have no backing field/API on
 * either platform, so this shows only what the real data returns.
 */
export function DashboardScreen({ navigation }: Props) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [referral, setReferral] = useState<Referral | null>(null);
  const [upcomingVaccine, setUpcomingVaccine] = useState<Vaccination | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [readyLabOrder, setReadyLabOrder] = useState<LabOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      dataService.getPatients(),
      dataService.getPrescriptions(),
      dataService.getReferrals(),
      dataService.getVaccinations(),
      dataService.getAppointments(),
      dataService.getLabOrders(),
    ])
      .then(([patients, prescriptions, referrals, vaccinations, appointments, labOrders]) => {
        if (cancelled) return;
        setPatient(patients[0] ?? null);

        const byNewest = <T extends { createdAt?: string; date?: string }>(rows: T[]) =>
          [...rows].sort((a, b) =>
            String(b.createdAt ?? b.date ?? '').localeCompare(String(a.createdAt ?? a.date ?? ''))
          );

        setPrescription(byNewest(prescriptions)[0] ?? null);
        setReferral(byNewest(referrals.filter((r) => r.status !== 'closed'))[0] ?? null);

        const pending = vaccinations
          .filter((v) => v.status === 'DUE' || v.status === 'OVERDUE')
          .sort((a, b) => String(a.scheduledDate ?? '').localeCompare(String(b.scheduledDate ?? '')));
        setUpcomingVaccine(pending[0] ?? null);

        const today = new Date().toISOString().slice(0, 10);
        const upcoming = appointments
          .filter((a) => a.appointmentDate >= today && a.status !== 'CANCELLED')
          .sort((a, b) =>
            `${a.appointmentDate}${a.appointmentTime ?? ''}`.localeCompare(
              `${b.appointmentDate}${b.appointmentTime ?? ''}`
            )
          );
        setNextAppointment(upcoming[0] ?? null);

        const done = labOrders
          .filter((o) => o.status === 'completed')
          .sort((a, b) => String(b.dateOrdered ?? '').localeCompare(String(a.dateOrdered ?? '')));
        setReadyLabOrder(done[0] ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>Loading your health record…</Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>
          No health record is linked to this account yet. Ask your ASHA worker or the facility desk
          to link it.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroGreeting}>Good morning,</Text>
            <Text style={styles.heroName}>{patient.name}</Text>
            {patient.abhaId ? <Text style={styles.heroAbha}>ABHA ID: {patient.abhaId}</Text> : null}
            <Text style={styles.heroSecure}>🛡 Health records are secure & private</Text>
          </View>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{(patient.name ?? '?').charAt(0)}</Text>
          </View>
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{patient.age ?? '—'}</Text>
            <Text style={styles.heroStatLabel}>Age (Years)</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{patient.gender ?? '—'}</Text>
            <Text style={styles.heroStatLabel}>Gender</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValueCap}>{patient.riskCategory ?? '—'}</Text>
            <Text style={styles.heroStatLabel}>Risk Level</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.sosCard} onPress={() => navigation.navigate('Emergency')}>
        <View style={styles.sosIcon}>
          <Text style={styles.sosIconText}>📞</Text>
        </View>
        <View style={styles.sosText}>
          <Text style={styles.sosTitle}>Emergency SOS</Text>
          <Text style={styles.sosSubtitle}>Ambulance 108 · Emergency contacts ready</Text>
        </View>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Next Appointment</Text>
        <View style={styles.appointmentBox}>
          {nextAppointment ? (
            <View style={styles.appointmentRow}>
              <View style={styles.appointmentLeft}>
                <Text style={styles.appointmentReason}>
                  {nextAppointment.reason ?? nextAppointment.specialty ?? 'Consultation'}
                </Text>
                {nextAppointment.doctorName ? (
                  <Text style={styles.appointmentDoctor}>{nextAppointment.doctorName}</Text>
                ) : null}
                {nextAppointment.facilityName ? (
                  <Text style={styles.appointmentFacility}>{nextAppointment.facilityName}</Text>
                ) : null}
              </View>
              <View style={styles.appointmentRight}>
                <Text style={styles.appointmentDate}>{formatDate(nextAppointment.appointmentDate)}</Text>
                {nextAppointment.appointmentTime ? (
                  <Text style={styles.appointmentTime}>{nextAppointment.appointmentTime}</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <Text style={styles.emptyHint}>No upcoming appointment booked.</Text>
          )}
          <Pressable style={styles.primaryBtnSmall} onPress={() => navigation.navigate('Appointments')}>
            <Text style={styles.primaryBtnSmallText}>View Details</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Current Medicines</Text>
          <Pressable onPress={() => navigation.navigate('Prescriptions')}>
            <Text style={styles.linkText}>View all →</Text>
          </Pressable>
        </View>
        {prescription?.medicines?.length ? (
          prescription.medicines.slice(0, 3).map((med, i) => (
            <View key={i} style={styles.medRow}>
              <View>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medInstructions}>{med.instructions || 'As directed'}</Text>
              </View>
              <Text style={styles.medFrequency}>{med.frequency}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyHint}>No active prescription on record.</Text>
        )}
        <Pressable style={styles.audioBtn} onPress={() => navigation.navigate('AudioPrescription')}>
          <Text style={styles.audioBtnText}>🔊 Listen to Audio Explanation</Text>
        </Pressable>
      </View>

      {referral && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Referral</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Specialty</Text>
            <Text style={styles.detailValue}>{referral.specialty}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Referred to</Text>
            <Text style={styles.detailValue}>{referral.targetFacilityName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.statusBadge}>{referral.status.replace('_', ' ')}</Text>
          </View>
          <Pressable style={styles.amberBtn} onPress={() => navigation.navigate('ReferralStatus')}>
            <Text style={styles.amberBtnText}>Track Referral Journey →</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Health Reminders</Text>
        {upcomingVaccine && (
          <View style={[styles.reminderBox, styles.reminderAmber]}>
            <Text style={styles.reminderTitleAmber}>
              {upcomingVaccine.status === 'OVERDUE' ? 'Vaccination Overdue' : 'Vaccination Due'}
            </Text>
            <Text style={styles.reminderTextAmber}>
              {upcomingVaccine.name}
              {upcomingVaccine.dose ? ` — ${upcomingVaccine.dose}` : ''}
            </Text>
            {upcomingVaccine.scheduledDate ? (
              <Text style={styles.reminderMetaAmber}>Due: {formatDate(upcomingVaccine.scheduledDate)}</Text>
            ) : null}
          </View>
        )}
        {readyLabOrder && (
          <View style={[styles.reminderBox, styles.reminderBlue]}>
            <Text style={styles.reminderTitleBlue}>Lab Report Ready</Text>
            <Text style={styles.reminderTextBlue}>{readyLabOrder.testName} results available</Text>
            {readyLabOrder.dateOrdered ? (
              <Text style={styles.reminderMetaBlue}>Ordered: {formatDate(readyLabOrder.dateOrdered)}</Text>
            ) : null}
          </View>
        )}
        {prescription && (
          <View style={[styles.reminderBox, styles.reminderGreen]}>
            <Text style={styles.reminderTitleGreen}>Active Prescription</Text>
            <Text style={styles.reminderTextGreen}>
              {prescription.medicines?.length
                ? `${prescription.medicines.length} medicine${prescription.medicines.length > 1 ? 's' : ''} prescribed`
                : 'Prescription issued'}
            </Text>
          </View>
        )}
        {!upcomingVaccine && !readyLabOrder && !prescription && (
          <Text style={styles.emptyHint}>No reminders right now.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          {(
            [
              ['Health Timeline', 'Timeline'],
              ['Lab Reports', 'LabReports'],
              ['Prescriptions', 'Prescriptions'],
              ['Vaccinations', 'Vaccinations'],
              ['Family', 'FamilyMembers'],
            ] as [string, keyof PatientStackParamList][]
          ).map(([label, screen]) => (
            <Pressable key={screen} style={styles.quickItem} onPress={() => navigation.navigate(screen as never)}>
              <View style={styles.quickIcon}>
                <Text style={styles.quickIconText}>•</Text>
              </View>
              <Text style={styles.quickLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6', padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#FAF9F6' },
  centeredText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  heroCard: { backgroundColor: '#15803D', borderRadius: 20, padding: 20, marginBottom: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeft: { flex: 1 },
  heroGreeting: { color: '#D1FAE5', fontSize: 13 },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  heroAbha: { color: '#D1FAE5', fontSize: 12, marginTop: 4 },
  heroSecure: { color: '#ECFDF5', fontSize: 11, marginTop: 10 },
  heroAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  heroAvatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroStats: { flexDirection: 'row', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroStatValueCap: { color: '#fff', fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  heroStatLabel: { color: '#D1FAE5', fontSize: 10, marginTop: 2 },
  sosCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FEF2F2', borderWidth: 2, borderColor: '#FECACA', borderRadius: 14, padding: 14, marginBottom: 14 },
  sosIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  sosIconText: { fontSize: 18 },
  sosText: { flex: 1 },
  sosTitle: { fontSize: 14, fontWeight: '800', color: '#B91C1C' },
  sosSubtitle: { fontSize: 11, color: '#DC2626', marginTop: 2 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, marginBottom: 14 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 10 },
  linkText: { fontSize: 11, fontWeight: '700', color: '#15803D' },
  appointmentBox: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#DCFCE7' },
  appointmentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  appointmentLeft: { flex: 1 },
  appointmentReason: { fontSize: 13, fontWeight: '800', color: '#166534' },
  appointmentDoctor: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  appointmentFacility: { fontSize: 11, color: '#6B7280' },
  appointmentRight: { alignItems: 'flex-end' },
  appointmentDate: { fontSize: 13, fontWeight: '800', color: '#15803D' },
  appointmentTime: { fontSize: 12, color: '#6B7280' },
  emptyHint: { fontSize: 12, color: '#9CA3AF' },
  primaryBtnSmall: { backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 12 },
  primaryBtnSmallText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  medRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, marginBottom: 8 },
  medName: { fontSize: 12, fontWeight: '700', color: '#111827' },
  medInstructions: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  medFrequency: { fontSize: 10, fontWeight: '700', color: '#1D4ED8', backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  audioBtn: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  audioBtnText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 12, color: '#6B7280' },
  detailValue: { fontSize: 12, fontWeight: '700', color: '#111827' },
  statusBadge: { fontSize: 10, fontWeight: '700', color: '#92400E', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, textTransform: 'capitalize' },
  amberBtn: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  amberBtnText: { color: '#92400E', fontSize: 12, fontWeight: '700' },
  reminderBox: { borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1 },
  reminderAmber: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  reminderTitleAmber: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  reminderTextAmber: { fontSize: 11, color: '#B45309', marginTop: 2 },
  reminderMetaAmber: { fontSize: 10, color: '#D97706', marginTop: 2 },
  reminderBlue: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  reminderTitleBlue: { fontSize: 12, fontWeight: '700', color: '#1E3A8A' },
  reminderTextBlue: { fontSize: 11, color: '#1D4ED8', marginTop: 2 },
  reminderMetaBlue: { fontSize: 10, color: '#2563EB', marginTop: 2 },
  reminderGreen: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  reminderTitleGreen: { fontSize: 12, fontWeight: '700', color: '#166534' },
  reminderTextGreen: { fontSize: 11, color: '#15803D', marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickItem: { width: '30%', alignItems: 'center', paddingVertical: 10 },
  quickIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  quickIconText: { fontSize: 18, color: '#15803D', fontWeight: '800' },
  quickLabel: { fontSize: 10, color: '#374151', marginTop: 6, textAlign: 'center', fontWeight: '600' },
});
