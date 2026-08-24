import React, { useState } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, User, Stethoscope, MapPin, AlertTriangle } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export const CalendarPage: React.FC = () => {
  const { currentRole } = useAuth();
  const [view, setView] = useState<'day' | 'week' | 'month' | 'agenda'>('month');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [events, setEvents] = useState([
    { id: '1', title: 'Village Immunization Session (MR-1 & JE)', time: '09:30 AM - 01:00 PM', date: '2026-08-23', type: 'immunization', location: 'Paud Anganwadi 01', priority: 'high' },
    { id: '2', title: 'High-Risk Maternal ANC Review (Kavita Gaikwad)', time: '02:00 PM - 03:00 PM', date: '2026-08-23', type: 'anc', location: 'Paud Subcenter', priority: 'critical' },
    { id: '3', title: 'NCD Screening & Blood Glucose Camp', time: '10:00 AM - 04:00 PM', date: '2026-08-25', type: 'camp', location: 'Kolvan Gram Panchayat', priority: 'normal' },
    { id: '4', title: 'Tele-Cardiology Consultation Session', time: '11:00 AM - 01:30 PM', date: '2026-08-26', type: 'teleconsult', location: 'PHC Paud Telemedicine Room', priority: 'high' },
  ]);

  const [newEvent, setNewEvent] = useState({
    title: '',
    time: '10:00 AM - 11:30 AM',
    date: '2026-08-24',
    location: '',
    priority: 'normal' as const,
  });

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setEvents([...events, { id: 'evt-' + Date.now(), ...newEvent, type: 'general' }]);
    setIsAddModalOpen(false);
    setNewEvent({ title: '', time: '10:00 AM - 11:30 AM', date: '2026-08-24', location: '', priority: 'normal' });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: `${currentRole.toUpperCase()} Dashboard`, href: `/${currentRole}/dashboard` },
          { label: 'Schedule & Clinical Calendar' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-gov-700" />
            Clinical Schedules, Home Visits & OPD Sessions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordinate field tasks, immunization drives, and tele-consultation clinics
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {(['day', 'week', 'month', 'agenda'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  view === v ? 'bg-white text-gov-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            New Schedule Item
          </Button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-slate-900 text-base">August 2026</h3>
          <span className="text-gov-700 font-semibold bg-gov-50 px-2 py-0.5 rounded border border-gov-200">
            Today: 23 Aug 2026
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg border hover:bg-slate-50 text-slate-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg border hover:bg-slate-50 text-slate-600">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Events Grid / Agenda View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map((evt) => (
          <div
            key={evt.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-card transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Badge
                  variant={
                    evt.priority === 'critical'
                      ? 'danger'
                      : evt.priority === 'high'
                      ? 'warning'
                      : 'primary'
                  }
                  size="sm"
                >
                  {evt.priority.toUpperCase()}
                </Badge>
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {evt.date}
                </span>
              </div>

              <h4 className="font-bold text-slate-900 text-sm leading-snug">{evt.title}</h4>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{evt.time}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{evt.location}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-gov-700 font-semibold">Scheduled Care Event</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => alert(`Opening event details: ${evt.title}`)}
              >
                View Flow
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Event Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Schedule New Healthcare Event / Clinic"
          description="Add a task, immunization session, or tele-consultation to the team calendar"
          size="md"
        >
          <form onSubmit={handleAddEvent} className="space-y-4">
            <Input
              label="Event Title"
              required
              placeholder="e.g. Village Polio / MR-1 Camp"
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
                label="Time Slot"
                required
                placeholder="10:00 AM - 01:00 PM"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
              />
            </div>

            <Input
              label="Location / Room"
              required
              placeholder="e.g. Paud Subcenter / Room 3"
              value={newEvent.location}
              onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
            />

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save to Calendar
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
