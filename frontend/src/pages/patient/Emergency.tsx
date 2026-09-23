import React, { useCallback, useEffect, useState } from 'react';
import { PhoneCall, AlertOctagon, ShieldAlert, MapPin, CheckCircle2, BellRing } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { backendApi, type PatientDetail } from '@arogyasetu/shared/services/api';
import { useToast } from '../../hooks/useToast';

const ageFrom = (dob?: string) => {
  if (!dob) return undefined;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
};

/** The current position, or null if the browser refuses or takes too long. */
const currentPosition = () =>
  new Promise<GeolocationCoordinates | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });

export const PatientEmergency: React.FC = () => {
  const toast = useToast();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [error, setError] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState<{ notified: string[]; coords: GeolocationCoordinates | null } | null>(null);

  const [editing, setEditing] = useState(false);
  const [contact, setContact] = useState({ name: '', phone: '' });
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { items } = await backendApi.getPatients({ limit: 1 });
      if (!items[0]) {
        setError('No patient record is linked to this account yet.');
        return;
      }
      setPatient(await backendApi.getPatient(items[0].id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your emergency card.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const raiseAlert = async () => {
    if (!patient) return;
    setIsSending(true);
    try {
      const coords = await currentPosition();
      const where = coords
        ? `Location: https://maps.google.com/?q=${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`
        : `Location not shared. Registered address: ${[patient.address, patient.village, patient.taluka, patient.district].filter(Boolean).join(', ') || 'not recorded'}.`;
      const res = await backendApi.sendUrgentAlert(
        patient.id,
        `${patient.name} pressed SOS and needs help now. ${where}`,
        `SOS from ${patient.name}`
      );
      setSent({ notified: res.notified, coords });
    } catch (err) {
      toast.error('Could not send the alert', err instanceof Error ? err.message : 'Call 108 directly.');
    } finally {
      setIsSending(false);
    }
  };

  const openEdit = () => {
    setContact({ name: patient?.emergencyContact?.name ?? '', phone: patient?.emergencyContact?.phone ?? '' });
    setEditing(true);
  };

  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setIsSaving(true);
    try {
      await backendApi.updatePatient(patient.id, {
        emergencyContact: contact.name.trim(),
        emergencyContactPhone: contact.phone.trim(),
      });
      toast.success('Emergency contact saved');
      setEditing(false);
      await load();
    } catch (err) {
      toast.error('Could not save the contact', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const age = ageFrom(patient?.dateOfBirth);
  const address = patient ? [patient.address, patient.village, patient.taluka, patient.district].filter(Boolean).join(', ') : '';

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Patient Portal' }, { label: 'Emergency & SOS' }]} />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink">Emergency & 108 SOS</h1>
          <p className="text-sm text-ink-soft">Call for an ambulance, alert your ASHA, and keep your emergency card ready</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
      )}

      <Card className="p-6 md:p-8 bg-gradient-to-br from-rose-500 to-red-700 text-white text-center rounded-2xl shadow-lg border-0">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-semibold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" /> Emergency Medical Services
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold">Need Immediate Medical Assistance?</h2>
          <p className="text-sm text-rose-100">
            Call 108 for an ambulance. The alert button also pages your ASHA worker with your location, so
            someone nearby knows to come.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="tel:108"
              className="px-8 py-4 bg-surface text-red-700 font-extrabold text-lg rounded-2xl shadow-2xl hover:bg-rose-50 active:scale-95 transition-all flex items-center gap-3 border-4 border-rose-200"
            >
              <PhoneCall className="w-6 h-6" /> CALL 108 AMBULANCE
            </a>
            <button
              onClick={() => void raiseAlert()}
              disabled={!patient || isSending}
              className="px-5 py-4 bg-white/15 border-2 border-white/60 text-white font-bold rounded-2xl hover:bg-white/25 disabled:opacity-60 flex items-center gap-2"
            >
              <BellRing className="w-5 h-5" /> {isSending ? 'Sending alert…' : 'Alert my ASHA'}
            </button>
          </div>

          {sent && (
            <div className="mt-2 p-4 bg-white/10 backdrop-blur rounded-xl border border-white/30 text-left space-y-2">
              <div className="flex items-center gap-2 text-emerald-200 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" /> Alert sent
              </div>
              <p className="text-xs text-white/90">
                {sent.notified.includes('ASHA')
                  ? `${patient?.assignedAsha?.name ?? 'Your ASHA worker'} has been paged with a critical alert.`
                  : 'No ASHA worker is assigned to you yet, so only your own account was notified. Please call 108.'}
              </p>
              <div className="flex items-center gap-2 text-xs text-white/80">
                <MapPin className="w-4 h-4 shrink-0" />
                {sent.coords
                  ? `Location shared: ${sent.coords.latitude.toFixed(4)}, ${sent.coords.longitude.toFixed(4)}`
                  : 'Location was not shared, so your registered address was sent instead.'}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-center gap-4 text-xs text-rose-100 flex-wrap">
            <span>Direct Helplines:</span>
            <a href="tel:108" className="underline font-bold hover:text-white">Ambulance: 108</a>
            <span>•</span>
            <a href="tel:104" className="underline font-bold hover:text-white">Health Advice: 104</a>
            <span>•</span>
            <a href="tel:112" className="underline font-bold hover:text-white">National Emergency: 112</a>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger">
        <Card className="p-5 border-l-4 border-l-rose-500 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink text-sm">Emergency Medical Card</h3>
            <Badge variant="danger">Show to responders</Badge>
          </div>

          {!patient ? (
            <p className="text-xs text-ink-soft">{error ? '-' : 'Loading…'}</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-ink-soft">Full Name</span>
                <p className="font-bold text-ink">{patient.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-ink-soft">Blood Group</span>
                  <p className="font-extrabold text-rose-600 text-base">{patient.bloodGroup ?? 'Not recorded'}</p>
                </div>
                <div>
                  <span className="text-xs text-ink-soft">Age / Gender</span>
                  <p className="font-semibold text-ink capitalize">
                    {[age != null ? `${age} yrs` : null, patient.gender].filter(Boolean).join(' / ') || 'Not recorded'}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs text-ink-soft">Known Allergies</span>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {patient.allergies.length > 0 ? (
                    patient.allergies.map((a) => (
                      <span key={a.id} className="px-2 py-0.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded border border-rose-200">
                        {a.substance}{a.reaction ? ` (${a.reaction})` : ''}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-ink-soft">No documented allergies</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs text-ink-soft">Chronic Conditions</span>
                <p className="text-xs font-semibold text-sand-700 mt-0.5">
                  {patient.chronicConditions.map((c) => c.condition).join(', ') || 'None recorded'}
                </p>
              </div>

              {patient.abhaId && (
                <div>
                  <span className="text-xs text-ink-soft">ABHA</span>
                  <p className="text-xs font-mono text-ink">{patient.abhaId}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink text-sm">Emergency Contacts</h3>
            <button onClick={openEdit} disabled={!patient} className="text-xs text-gov-600 font-semibold hover:underline disabled:opacity-50">
              Edit Contact
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
            <div className="p-3.5 bg-sand-50 rounded-xl border border-line space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink text-sm">{patient?.emergencyContact?.name ?? 'No contact saved'}</span>
                <Badge variant="default" className="text-[10px]">Family / Primary</Badge>
              </div>
              {patient?.emergencyContact?.phone ? (
                <a
                  href={`tel:${patient.emergencyContact.phone}`}
                  className="block text-center py-1.5 bg-gov-600 text-white text-xs font-semibold rounded-lg hover:bg-gov-700"
                >
                  Call: {patient.emergencyContact.phone}
                </a>
              ) : (
                <button onClick={openEdit} disabled={!patient} className="w-full py-1.5 border border-line text-xs font-semibold rounded-lg hover:bg-surface">
                  Add an emergency contact
                </button>
              )}
            </div>

            <div className="p-3.5 bg-sand-50 rounded-xl border border-line space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink text-sm">{patient?.assignedAsha?.name ?? 'No ASHA assigned'}</span>
                <Badge variant="info" className="text-[10px]">Your ASHA Worker</Badge>
              </div>
              <p className="text-xs text-ink-soft">
                {patient?.assignedAsha?.village ? `${patient.assignedAsha.village} village` : 'Local health worker'}
              </p>
              {patient?.assignedAsha?.phone && (
                <a
                  href={`tel:${patient.assignedAsha.phone}`}
                  className="block text-center py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                >
                  Call ASHA: {patient.assignedAsha.phone}
                </a>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-800">Registered Residence</p>
              <p className="text-xs text-amber-700 mt-0.5">{address || 'No address recorded. Your ASHA can add it.'}</p>
            </div>
          </div>
        </Card>
      </div>

      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Emergency Contact">
        <form onSubmit={saveContact} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Name and relation</label>
            <input
              required
              maxLength={120}
              placeholder="e.g. Ramesh Patil (son)"
              value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Mobile number</label>
            <input
              required
              type="tel"
              maxLength={20}
              pattern="[0-9+\s]{10,20}"
              placeholder="e.g. +91 98220 19923"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-gov-600 text-white text-sm font-semibold rounded-lg hover:bg-gov-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save Contact'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2.5 border border-line text-sand-700 text-sm font-semibold rounded-lg hover:bg-sand-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PatientEmergency;
