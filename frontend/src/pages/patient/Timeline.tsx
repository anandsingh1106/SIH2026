import React, { useEffect, useState } from 'react';
import { Clock, Pill, FlaskConical, Syringe, ArrowRightLeft, Stethoscope, Filter } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { dataService } from '../../services/api/dataService';
import type { PatientTimelineEvent } from '../../types';

type EventType = 'all' | 'consultation' | 'prescription' | 'lab' | 'referral' | 'vaccination' | 'registration';

interface TimelineEvent {
  id: string;
  date: string;
  type: EventType;
  title: string;
  subtitle: string;
  detail: string;
  badge?: string;
  badgeVariant?: 'success' | 'info' | 'warning' | 'danger' | 'default';
}

const TYPE_COLORS: Record<string, string> = {
  registration: 'bg-sand-500',
  consultation: 'bg-gov-600',
  prescription: 'bg-purple-600',
  lab: 'bg-blue-600',
  referral: 'bg-amber-500',
  vaccination: 'bg-green-600',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  registration: <Clock className="w-3.5 h-3.5 text-white" />,
  consultation: <Stethoscope className="w-3.5 h-3.5 text-white" />,
  prescription: <Pill className="w-3.5 h-3.5 text-white" />,
  lab: <FlaskConical className="w-3.5 h-3.5 text-white" />,
  referral: <ArrowRightLeft className="w-3.5 h-3.5 text-white" />,
  vaccination: <Syringe className="w-3.5 h-3.5 text-white" />,
};

function formatEventDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Maps a timeline event from the API onto the shape this page renders. */
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

export const PatientTimeline: React.FC = () => {
  const [filter, setFilter] = useState<EventType>('all');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // The patient's own record is the only one their API access returns.
    dataService
      .getPatients()
      .then(async (patients) => {
        const me = patients[0];
        if (!me) return [] as PatientTimelineEvent[];
        return dataService.getPatientTimeline(me.id);
      })
      .then((rows) => {
        if (cancelled) return;
        setEvents(rows.map(toDisplayEvent));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);

  const filterButtons: { label: string; value: EventType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Consultations', value: 'consultation' },
    { label: 'Prescriptions', value: 'prescription' },
    { label: 'Lab Reports', value: 'lab' },
    { label: 'Referrals', value: 'referral' },
    { label: 'Vaccinations', value: 'vaccination' },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Patient Portal' }, { label: 'Health Timeline' }]} />

      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-gov-600" />
        <div>
          <h1 className="text-xl font-bold text-ink">Longitudinal Health Timeline</h1>
          <p className="text-sm text-ink-soft">Your complete medical history in chronological order</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-ink-soft mt-2.5 shrink-0" />
        {filterButtons.map(btn => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === btn.value
                ? 'bg-gov-600 text-white'
                : 'bg-sand-100 text-ink-muted hover:bg-sand-200'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {loading && (
        <Card className="p-8 text-center text-sm text-ink-soft">Loading your health timeline…</Card>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="p-8 text-center text-sm text-ink-soft">
          {events.length === 0
            ? 'No health records yet. Consultations, prescriptions and lab reports will appear here.'
            : 'No events of this type.'}
        </Card>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-sand-200 z-0" />

        <div className="space-y-0">
          {filtered.map((event, idx) => {
            const isNewDate = idx === 0 || filtered[idx - 1].date !== event.date;
            return (
              <div key={event.id}>
                {isNewDate && (
                  <div className="relative flex items-center gap-3 mb-3 mt-4 first:mt-0">
                    <div className="z-10 w-10 h-6 flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-sand-400" />
                    </div>
                    <span className="text-xs font-bold text-ink-soft uppercase tracking-widest bg-sand-50 px-2">
                      {event.date}
                    </span>
                  </div>
                )}

                <div className="relative flex items-start gap-4 mb-3 pl-0">
                  {/* Icon dot */}
                  <div className={`z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${TYPE_COLORS[event.type]}`}>
                    {TYPE_ICONS[event.type]}
                  </div>

                  {/* Card */}
                  <Card className="flex-1 p-4 hover:shadow-card transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink text-sm">{event.title}</p>
                        <p className="text-xs text-ink-soft mt-0.5">{event.subtitle}</p>
                        <p className="text-xs text-ink-muted mt-2 leading-relaxed">{event.detail}</p>
                      </div>
                      {event.badge && (
                        <Badge variant={event.badgeVariant ?? 'default'} className="text-xs shrink-0">
                          {event.badge}
                        </Badge>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-ink-soft">
          <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No events found for this filter</p>
        </div>
      )}
    </div>
  );
};

export default PatientTimeline;

