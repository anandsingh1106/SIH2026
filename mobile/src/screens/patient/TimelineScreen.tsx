import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import type { PatientTimelineEvent } from '@arogyasetu/shared/types';
import type { PatientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PatientStackParamList, 'Timeline'>;
type EventType = 'all' | 'consultation' | 'prescription' | 'lab' | 'referral' | 'vaccination' | 'registration';

interface TimelineEvent {
  id: string;
  date: string;
  type: EventType;
  title: string;
  subtitle: string;
  detail: string;
}

const TYPE_COLORS: Record<string, string> = {
  registration: '#78716C',
  consultation: '#15803D',
  prescription: '#7C3AED',
  lab: '#2563EB',
  referral: '#D97706',
  vaccination: '#16A34A',
};

const TYPE_ICONS: Record<string, string> = {
  registration: '🕐',
  consultation: '🩺',
  prescription: '💊',
  lab: '🧪',
  referral: '⇄',
  vaccination: '💉',
};

function formatEventDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toDisplayEvent(e: PatientTimelineEvent): TimelineEvent {
  return {
    id: e.id,
    date: formatEventDate(e.date),
    type: e.type as EventType,
    title: e.title,
    subtitle: e.actor,
    detail: e.notes,
  };
}

const FILTERS: { label: string; value: EventType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Consultations', value: 'consultation' },
  { label: 'Prescriptions', value: 'prescription' },
  { label: 'Lab Reports', value: 'lab' },
  { label: 'Referrals', value: 'referral' },
  { label: 'Vaccinations', value: 'vaccination' },
];

/** Mirrors frontend/src/pages/patient/Timeline.tsx. */
export function TimelineScreen(_props: Props) {
  const [filter, setFilter] = useState<EventType>('all');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    dataService
      .getPatients()
      .then(async (patients) => {
        const me = patients[0];
        if (!me) return [] as PatientTimelineEvent[];
        return dataService.getPatientTimeline(me.id);
      })
      .then((rows) => {
        if (!cancelled) setEvents(rows.map(toDisplayEvent));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);

  return (
    <View style={styles.screen}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {FILTERS.map((btn) => (
          <Pressable
            key={btn.value}
            style={[styles.filterPill, filter === btn.value && styles.filterPillActive]}
            onPress={() => setFilter(btn.value)}
          >
            <Text style={[styles.filterPillText, filter === btn.value && styles.filterPillTextActive]}>
              {btn.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.list}>
        {loading && <Text style={styles.emptyText}>Loading your health timeline…</Text>}

        {!loading && filtered.length === 0 && (
          <Text style={styles.emptyText}>
            {events.length === 0
              ? 'No health records yet. Consultations, prescriptions and lab reports will appear here.'
              : 'No events of this type.'}
          </Text>
        )}

        {filtered.map((event, idx) => {
          const isNewDate = idx === 0 || filtered[idx - 1].date !== event.date;
          return (
            <View key={event.id}>
              {isNewDate && <Text style={styles.dateHeader}>{event.date}</Text>}
              <View style={styles.eventRow}>
                <View style={[styles.eventDot, { backgroundColor: TYPE_COLORS[event.type] ?? '#6B7280' }]}>
                  <Text style={styles.eventDotIcon}>{TYPE_ICONS[event.type] ?? '•'}</Text>
                </View>
                <View style={styles.eventCard}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.subtitle ? <Text style={styles.eventSubtitle}>{event.subtitle}</Text> : null}
                  {event.detail ? <Text style={styles.eventDetail}>{event.detail}</Text> : null}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 0 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterPillActive: { backgroundColor: '#15803D' },
  filterPillText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  filterPillTextActive: { color: '#fff' },
  list: { flex: 1, paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 12 },
  dateHeader: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  eventRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  eventDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  eventDotIcon: { fontSize: 14 },
  eventCard: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12 },
  eventTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  eventSubtitle: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  eventDetail: { fontSize: 11, color: '#4B5563', marginTop: 6, lineHeight: 16 },
});
