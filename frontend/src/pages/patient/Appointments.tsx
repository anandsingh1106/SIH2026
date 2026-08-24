import React, { useEffect, useState } from 'react';
import { Calendar, Video, MapPin, Clock, X, RefreshCw, ChevronRight, Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { appointmentsApi, Appointment } from '../../services/api/appointmentsApi';
import { INITIAL_FACILITIES } from '../../data/mockData';
import { useToast } from '../../hooks/useToast';

const EMPTY_FORM = {
  facility: INITIAL_FACILITIES[0]?.name || '',
  doctor: '',
  specialty: '',
  date: '',
  time: '',
  type: 'in-person' as 'in-person' | 'telemedicine',
  reason: '',
};

export const PatientAppointments: React.FC = () => {
  const toast = useToast();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    try {
      const { items } = await appointmentsApi.list();
      setAppointments(items);
    } catch (err) {
      toast.error('Could not load appointments', err instanceof Error ? err.message : undefined);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcoming = appointments.filter((a) => a.status === 'upcoming');
  const past = appointments.filter((a) => a.status !== 'upcoming');
  const displayed = tab === 'upcoming' ? upcoming : past;

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success('Appointment booked');
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
      toast.success('Appointment cancelled');
      await loadAppointments();
    } catch (err) {
      toast.error('Could not cancel appointment', err instanceof Error ? err.message : undefined);
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
      toast.success('Appointment rescheduled');
      await loadAppointments();
    } catch (err) {
      toast.error('Could not reschedule appointment', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Patient Portal' }, { label: 'Appointments' }]} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-gov-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Appointments</h1>
            <p className="text-sm text-slate-500">Upcoming and past consultations</p>
          </div>
        </div>

        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setBookModalOpen(true)}>
          Book Appointment
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border border-slate-200 rounded-xl overflow-hidden w-fit">
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold transition-colors capitalize ${
              tab === t ? 'bg-gov-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t} ({t === 'upcoming' ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading appointments…</div>
        ) : (
          <>
            {displayed.map((apt) => (
              <Card key={apt.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {apt.type === 'telemedicine' ? (
                        <Video className="w-4 h-4 text-blue-600" />
                      ) : (
                        <MapPin className="w-4 h-4 text-gov-600" />
                      )}
                      <p className="font-bold text-slate-800">{apt.reason || `${apt.specialty} Consultation`}</p>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{apt.doctor} · {apt.specialty}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{apt.facility}</p>

                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700">{apt.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700">{apt.time}</span>
                      </div>
                      {apt.tokenNumber && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">Token:</span>
                          <span className="text-xs font-bold text-gov-700">#{apt.tokenNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant={
                        apt.status === 'upcoming' ? 'info' : apt.status === 'completed' ? 'success' : 'danger'
                      }
                      className="text-xs capitalize"
                    >
                      {apt.status}
                    </Badge>
                    <Badge variant={apt.type === 'telemedicine' ? 'info' : 'default'} className="text-xs">
                      {apt.type === 'telemedicine' ? '📹 Tele-consult' : '🏥 In-person'}
                    </Badge>
                  </div>
                </div>

                {apt.status === 'upcoming' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    {apt.type === 'telemedicine' && (
                      <button className="flex items-center gap-2 px-4 py-2 bg-gov-600 text-white text-xs font-semibold rounded-lg hover:bg-gov-700 transition-colors">
                        <Video className="w-4 h-4" />
                        Join Video Call
                      </button>
                    )}
                    <button
                      onClick={() => openReschedule(apt.id)}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reschedule
                    </button>
                    <button
                      onClick={() => setCancelModal(apt.id)}
                      className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                )}

                {apt.status === 'completed' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                      View Consultation Summary
                    </button>
                  </div>
                )}
              </Card>
            ))}

            {displayed.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No {tab} appointments</p>
                {tab === 'upcoming' && (
                  <p className="text-xs mt-1">Book a new appointment using the button above</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Book Appointment Modal */}
      <Modal
        isOpen={bookModalOpen}
        onClose={() => setBookModalOpen(false)}
        title="Book New Appointment"
      >
        <form onSubmit={handleBook} className="space-y-4">
          <Select
            label="Facility"
            required
            value={bookForm.facility}
            onChange={(e) => setBookForm({ ...bookForm, facility: e.target.value })}
            options={INITIAL_FACILITIES.map((f) => ({ value: f.name, label: f.name }))}
          />

          <Input
            label="Doctor Name"
            required
            placeholder="e.g. Dr. Rajesh Deshmukh"
            value={bookForm.doctor}
            onChange={(e) => setBookForm({ ...bookForm, doctor: e.target.value })}
          />

          <Input
            label="Specialty"
            required
            placeholder="e.g. General Medicine"
            value={bookForm.specialty}
            onChange={(e) => setBookForm({ ...bookForm, specialty: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              required
              value={bookForm.date}
              onChange={(e) => setBookForm({ ...bookForm, date: e.target.value })}
            />
            <Input
              label="Time"
              type="time"
              required
              value={bookForm.time}
              onChange={(e) => setBookForm({ ...bookForm, time: e.target.value })}
            />
          </div>

          <Select
            label="Consultation Type"
            value={bookForm.type}
            onChange={(e) => setBookForm({ ...bookForm, type: e.target.value as 'in-person' | 'telemedicine' })}
            options={[
              { value: 'in-person', label: 'In-Person' },
              { value: 'telemedicine', label: 'Telemedicine (Video Call)' },
            ]}
          />

          <Input
            label="Reason for Visit"
            placeholder="e.g. Follow-up: Hypertension"
            value={bookForm.reason}
            onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })}
          />

          {bookError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {bookError}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full font-bold" isLoading={isSubmitting}>
            Confirm Booking
          </Button>
        </form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={!!cancelModal}
        onClose={() => setCancelModal(null)}
        title="Cancel Appointment"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to cancel this appointment?
            Please inform your healthcare provider if you are unable to attend.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleConfirmCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Yes, Cancel Appointment
            </button>
            <button
              onClick={() => setCancelModal(null)}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Keep Appointment
            </button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={!!rescheduleModal}
        onClose={() => setRescheduleModal(null)}
        title="Reschedule Appointment"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="New Date"
              type="date"
              required
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
            <Input
              label="New Time"
              type="time"
              required
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
            />
          </div>
          <button
            onClick={handleConfirmReschedule}
            disabled={isSubmitting || !rescheduleDate || !rescheduleTime}
            className="w-full px-4 py-2.5 bg-gov-600 text-white text-sm font-semibold rounded-lg hover:bg-gov-700 transition-colors disabled:opacity-50"
          >
            Confirm New Time
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PatientAppointments;
