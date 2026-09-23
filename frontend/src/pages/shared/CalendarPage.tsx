import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../services/auth/authContext';
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, MapPin, Trash2 } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { appointmentsApi } from '../../services/api/appointmentsApi';
import { backendApi } from '@arogyasetu/shared/services/api';
import { localDateString } from '@arogyasetu/shared/utils';
import { useToast } from '../../hooks/useToast';

type Source = 'appointment' | 'task' | 'personal';

interface CalendarEvent {
  id: string;
  source: Source;
  title: string;
  date: string;
  time?: string;
  location?: string;
  detail?: string;
  priority: 'critical' | 'high' | 'normal';
  link?: string;
}

const SOURCE_LABEL: Record<Source, string> = {
  appointment: 'Appointment',
  task: 'Task due',
  personal: 'My note',
};

// Personal entries are a per-device convenience, so they live in browser
// storage; appointments and tasks always come from the server.
const storageKey = (userId?: string) => `arogyasetu.calendar.${userId ?? 'anon'}`;

function loadPersonal(userId?: string): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
  } catch {
    return [];
  }
}

function savePersonal(userId: string | undefined, events: CalendarEvent[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(events));
  } catch {
    // Storage can be unavailable (private mode); the entry just won't persist.
  }
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const CalendarPage: React.FC = () => {
  const toast = useToast();
  const { currentRole, currentUser } = useAuth();
  const today = localDateString();

  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [serverEvents, setServerEvents] = useState<CalendarEvent[]>([]);
  const [personal, setPersonal] = useState<CalendarEvent[]>(() => loadPersonal(currentUser?.id));
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: today, time: '', location: '' });

  useEffect(() => {
    setPersonal(loadPersonal(currentUser?.id));
  }, [currentUser?.id]);

  useEffect(() => {
    let cancelled = false;
    const appointmentLink =
      currentRole === 'patient' ? '/patient/appointments' : currentRole === 'doctor' ? '/doctor/queue' : undefined;
    const taskLink = currentRole === 'asha' ? '/asha/tasks' : undefined;

    Promise.all([
      appointmentsApi.list({ limit: 100 }).then((r) => r.items).catch(() => []),
      // Only field and clinical staff carry tasks.
      currentRole === 'patient' ? Promise.resolve([]) : backendApi.getTasks().then((r) => r.items).catch(() => []),
    ]).then(([appointments, tasks]) => {
      if (cancelled) return;
      const fromAppointments: CalendarEvent[] = appointments
        .filter((a) => a.status !== 'cancelled')
        .map((a) => ({
          id: `apt-${a.id}`,
          source: 'appointment',
          title: a.reason || `${a.specialty || 'Consultation'}${a.patient ? ` with ${a.patient}` : a.doctor ? ` with ${a.doctor}` : ''}`,
          date: a.date,
          time: a.time,
          location: a.type === 'telemedicine' ? 'Video consultation' : a.facility,
          detail: [a.patient && `Patient: ${a.patient}`, a.doctor && `Doctor: ${a.doctor}`, a.specialty, a.status === 'completed' ? 'Completed' : null]
            .filter(Boolean).join(' • '),
          priority: 'normal',
          link: appointmentLink,
        }));
      const fromTasks: CalendarEvent[] = tasks
        .filter((t) => t.dueDate && !['COMPLETED', 'CANCELLED'].includes(String(t.status).toUpperCase()))
        .map((t) => ({
          id: `task-${t.id}`,
          source: 'task',
          title: t.title,
          date: String(t.dueDate).slice(0, 10),
          detail: [t.patientName && `Patient: ${t.patientName}`, t.description].filter(Boolean).join(' • '),
          priority: t.priority === 'URGENT' ? 'critical' : t.priority === 'HIGH' ? 'high' : 'normal',
          link: taskLink,
        }));
      setServerEvents([...fromAppointments, ...fromTasks]);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentRole]);

  const events = useMemo(
    () => [...serverEvents, ...personal].sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? ''))),
    [serverEvents, personal]
  );

  const month = monthKey(cursor);
  const inMonth = events.filter((e) => e.date.startsWith(month));
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of inMonth) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return map;
  }, [inMonth]);

  // Monday-first grid covering the whole month.
  const firstWeekday = (cursor.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];

  const shiftMonth = (delta: number) => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    setSelectedDay(null);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: CalendarEvent = {
      id: `me-${Date.now()}`,
      source: 'personal',
      title: newEvent.title.trim(),
      date: newEvent.date,
      time: newEvent.time || undefined,
      location: newEvent.location.trim() || undefined,
      priority: 'normal',
    };
    const next = [...personal, entry];
    setPersonal(next);
    savePersonal(currentUser?.id, next);
    setIsAddModalOpen(false);
    setNewEvent({ title: '', date: today, time: '', location: '' });
    toast.success('Added to your calendar', 'Saved on this device.');
  };

  const removePersonal = (id: string) => {
    const next = personal.filter((p) => p.id !== id);
    setPersonal(next);
    savePersonal(currentUser?.id, next);
    setSelected(null);
  };

  const agendaList = selectedDay ? byDay.get(selectedDay) ?? [] : inMonth;

  const EventCard = ({ evt }: { evt: CalendarEvent }) => (
    <button
      type="button"
      onClick={() => setSelected(evt)}
      className="w-full text-left bg-surface rounded-2xl border border-line p-4 shadow-xs hover:shadow-card transition-all space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <Badge variant={evt.priority === 'critical' ? 'danger' : evt.priority === 'high' ? 'warning' : 'primary'} size="sm">
          {SOURCE_LABEL[evt.source]}
        </Badge>
        <span className={`text-[11px] font-semibold ${evt.date < today && evt.source === 'task' ? 'text-rose-600' : 'text-ink-soft'}`}>
          {evt.date}
        </span>
      </div>
      <h4 className="font-bold text-ink text-sm leading-snug">{evt.title}</h4>
      <div className="space-y-1 text-xs text-ink-soft">
        {evt.time && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 shrink-0" /> {evt.time}</div>}
        {evt.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" /> {evt.location}</div>}
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: `${currentRole.toUpperCase()} Dashboard`, href: `/${currentRole}/dashboard` },
          { label: 'Schedule & Calendar' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <Calendar className="w-6 h-6 text-gov-700" />
            Schedule & Calendar
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">Your appointments and due tasks, plus your own notes</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-sand-100 p-1 rounded-xl text-xs font-semibold">
            {(['month', 'agenda'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  view === v ? 'bg-surface text-gov-800 shadow-xs font-bold' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsAddModalOpen(true)}>
            New Note
          </Button>
        </div>
      </div>

      <div className="bg-surface p-4 rounded-xl border border-line shadow-xs flex items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-bold text-ink text-base">
            {cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => { setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setSelectedDay(today); }}
            className="text-gov-700 font-semibold bg-gov-50 px-2 py-0.5 rounded border border-gov-200 hover:bg-gov-100"
          >
            Today: {new Date(`${today}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </button>
          <span className="text-ink-soft">{isLoading ? 'Loading…' : `${inMonth.length} items this month`}</span>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="p-1.5 rounded-lg border hover:bg-sand-50 text-ink-muted">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => shiftMonth(1)} aria-label="Next month" className="p-1.5 rounded-lg border hover:bg-sand-50 text-ink-muted">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === 'month' && (
        <div className="bg-surface rounded-2xl border border-line p-3 shadow-xs">
          <div className="grid grid-cols-7 text-[10px] font-bold uppercase text-ink-soft text-center pb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`blank-${i}`} />;
              const dayEvents = byDay.get(day) ?? [];
              const isToday = day === today;
              const isSelected = day === selectedDay;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[64px] rounded-lg border p-1.5 text-left text-[11px] transition-colors ${
                    isSelected ? 'border-gov-600 bg-gov-50' : isToday ? 'border-gov-300 bg-gov-50/40' : 'border-line hover:bg-sand-50'
                  }`}
                >
                  <span className={`font-bold ${isToday ? 'text-gov-700' : 'text-ink'}`}>{Number(day.slice(8))}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <p key={e.id} className={`truncate rounded px-1 ${
                        e.source === 'task' ? 'bg-amber-100 text-amber-900' : e.source === 'personal' ? 'bg-purple-100 text-purple-900' : 'bg-blue-100 text-blue-900'
                      }`}>
                        {e.time ? `${e.time} ` : ''}{e.title}
                      </p>
                    ))}
                    {dayEvents.length > 2 && <p className="text-ink-soft">+{dayEvents.length - 2} more</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {view === 'month' && (
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            {selectedDay
              ? new Date(`${selectedDay}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
              : 'Everything this month'}
          </h3>
        )}
        {agendaList.length === 0 ? (
          <p className="p-6 text-center text-xs text-ink-soft bg-surface border border-dashed border-line rounded-xl">
            {isLoading ? 'Loading…' : 'Nothing scheduled.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agendaList.map((evt) => <EventCard key={evt.id} evt={evt} />)}
          </div>
        )}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ''} size="md">
        {selected && (
          <div className="space-y-3 text-xs">
            <Badge variant="primary" size="sm">{SOURCE_LABEL[selected.source]}</Badge>
            <div className="space-y-1.5 text-ink-muted">
              <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {selected.date}{selected.time ? `, ${selected.time}` : ''}</p>
              {selected.location && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {selected.location}</p>}
              {selected.detail && <p>{selected.detail}</p>}
            </div>
            <div className="flex gap-2 pt-2">
              {selected.link && (
                <Link to={selected.link} className="flex-1 text-center px-4 py-2 bg-gov-600 text-white font-bold rounded-lg hover:bg-gov-700">
                  Open
                </Link>
              )}
              {selected.source === 'personal' && (
                <button
                  onClick={() => removePersonal(selected.id)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-rose-200 text-rose-700 font-bold rounded-lg hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete note
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add a Note to Your Calendar"
        description="Saved on this device only. Appointments and tasks appear here automatically."
        size="md"
      >
        <form onSubmit={handleAddEvent} className="space-y-4">
          <Input
            label="Title"
            required
            maxLength={120}
            placeholder="e.g. Village MR-1 immunization session"
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              required
              value={newEvent.date}
              onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
            />
            <Input
              label="Time (optional)"
              type="time"
              value={newEvent.time}
              onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
            />
          </div>
          <Input
            label="Location (optional)"
            maxLength={120}
            placeholder="e.g. Paud Anganwadi"
            value={newEvent.location}
            onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
          />
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
