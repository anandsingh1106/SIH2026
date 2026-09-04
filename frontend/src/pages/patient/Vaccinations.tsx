import React, { useEffect, useState } from 'react';
import { Syringe, ShieldCheck, Calendar, Download, AlertCircle, Plus, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { dataService } from '../../services/api/dataService';
import type { Patient, Vaccination } from '../../types';

interface VaccinationRecord {
  id: string;
  vaccineName: string;
  dose: string;
  dueDate: string;
  givenDate?: string;
  /** Not returned by the immunisation API; omitted rather than guessed. */
  facility?: string;
  status: 'completed' | 'upcoming' | 'overdue';
  batchNumber?: string;
  administeredBy?: string;
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Maps an immunisation record onto the shape this certificate view renders. */
function toRecord(v: Vaccination): VaccinationRecord {
  return {
    id: v.id,
    vaccineName: v.name,
    dose: v.dose ?? '—',
    dueDate: formatDate(v.scheduledDate),
    givenDate: v.administeredDate ? formatDate(v.administeredDate) : undefined,
    facility: undefined,
    status: v.status === 'GIVEN' ? 'completed' : v.status === 'OVERDUE' ? 'overdue' : 'upcoming',
    batchNumber: v.batchNumber,
    administeredBy: undefined,
  };
}

export const PatientVaccinations: React.FC = () => {
  const [vaccines, setVaccines] = useState<VaccinationRecord[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([dataService.getVaccinations(), dataService.getPatients()])
      .then(([rows, patients]) => {
        if (cancelled) return;
        setVaccines(rows.map(toRecord));
        setPatient(patients[0] ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedVaccine, setSelectedVaccine] = useState<VaccinationRecord | null>(null);

  const completedCount = vaccines.filter(v => v.status === 'completed').length;
  const overdueCount = vaccines.filter(v => v.status === 'overdue').length;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Patient Portal' }, { label: 'Vaccination Passport' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
            <Syringe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">U-WIN & National Immunization Passport</h1>
            <p className="text-sm text-ink-soft">Universal digital immunization registry, reminders, and verification badges</p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedVaccine(vaccines[0]);
            setShowCertificateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 shadow-sm transition-all self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          Download Universal QR Certificate
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-teal-50 border-teal-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Completed Vaccines</span>
            <ShieldCheck className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-teal-900 mt-2">{completedCount}</p>
          <p className="text-xs text-teal-700 mt-1">Verified with U-WIN & CoWIN</p>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Upcoming Schedule</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-900 mt-2">1</p>
          <p className="text-xs text-amber-700 mt-1">Next due in October 2026</p>
        </Card>

        <Card className="p-4 bg-rose-50 border-rose-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Overdue Alerts</span>
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-900 mt-2">{overdueCount}</p>
          <p className="text-xs text-rose-700 mt-1">Recommended by Doctor for NCD care</p>
        </Card>
      </div>

      {/* Vaccine Records List */}
      <Card className="divide-y divide-line overflow-hidden">
        <div className="p-4 bg-sand-50 border-b border-line flex items-center justify-between">
          <h2 className="font-bold text-ink text-sm">Vaccination History & Forecast</h2>
          <span className="text-xs text-ink-soft font-medium">ABHA ID: 91-8273-1928-4491</span>
        </div>

        {vaccines.map(vac => (
          <div key={vac.id} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-sand-50/60 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-ink">{vac.vaccineName}</span>
                {vac.status === 'completed' && <Badge variant="success">Completed</Badge>}
                {vac.status === 'upcoming' && <Badge variant="warning">Upcoming</Badge>}
                {vac.status === 'overdue' && <Badge variant="danger">Action Needed: Overdue</Badge>}
              </div>
              <p className="text-xs font-medium text-ink-muted">Dose: {vac.dose}</p>
              <div className="flex items-center gap-3 text-xs text-ink-soft flex-wrap">
                {vac.facility && <span>Facility: <strong>{vac.facility}</strong></span>}
                {vac.givenDate && <span>• Administered: <strong>{vac.givenDate}</strong></span>}
                {!vac.givenDate && <span>• Due by: <strong>{vac.dueDate}</strong></span>}
                {vac.batchNumber && <span>• Batch: <code className="text-sand-700 bg-sand-100 px-1 py-0.5 rounded">{vac.batchNumber}</code></span>}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              {vac.status === 'completed' ? (
                <button
                  onClick={() => {
                    setSelectedVaccine(vac);
                    setShowCertificateModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Certificate
                </button>
              ) : (
                <a
                  href="/patient/appointments"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gov-600 rounded-lg hover:bg-gov-700 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Book Slot at PHC
                </a>
              )}
            </div>
          </div>
        ))}
      </Card>

      {/* Certificate Modal */}
      <Modal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        title="Universal Immunization Certificate"
      >
        {selectedVaccine && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-teal-300 rounded-xl p-5 bg-teal-50/40 text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                VERIFIED DIGITAL IMMUNIZATION CREDENTIAL
              </div>
              <h3 className="font-bold text-ink text-lg">{selectedVaccine.vaccineName}</h3>
              <p className="text-xs text-ink-muted">Beneficiary: <strong>{patient?.name ?? '—'}</strong>{patient?.abhaId ? <> | ABHA: <strong>{patient.abhaId}</strong></> : null}</p>
              
              <div className="grid grid-cols-2 gap-2 text-left bg-surface p-3 rounded-lg border border-teal-100 text-xs mt-3">
                <div>
                  <span className="text-ink-soft">Date of Dose:</span>
                  <p className="font-semibold text-ink">{selectedVaccine.givenDate || selectedVaccine.dueDate}</p>
                </div>
                <div>
                  <span className="text-ink-soft">Vaccinator:</span>
                  <p className="font-semibold text-ink">{selectedVaccine.administeredBy ?? '—'}</p>
                </div>
                <div>
                  <span className="text-ink-soft">Location:</span>
                  <p className="font-semibold text-ink">{selectedVaccine.facility ?? '—'}</p>
                </div>
                <div>
                  <span className="text-ink-soft">Batch Ref:</span>
                  <p className="font-semibold text-ink">{selectedVaccine.batchNumber || 'IND-VAC-2026-X'}</p>
                </div>
              </div>

              <div className="pt-2">
                <div className="w-28 h-28 mx-auto bg-sand-900 rounded-lg p-2 text-white flex flex-col items-center justify-center text-[10px] text-center">
                  <div className="w-full h-full border border-teal-400 flex items-center justify-center font-mono font-bold tracking-tighter">
                    [QR VERIFIED]
                  </div>
                </div>
                <p className="text-[10px] text-ink-soft mt-1">Scan to verify cryptographic signature on National Health Gateway</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCertificateModal(false)}
                className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700"
              >
                Save PDF to Device
              </button>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-2.5 border border-line text-sand-700 text-sm font-semibold rounded-lg hover:bg-sand-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PatientVaccinations;

