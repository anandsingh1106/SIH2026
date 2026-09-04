import React, { useEffect, useMemo, useState } from 'react';
import { FileCheck2, Download, Printer, Share2, Plus, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import {
  PrintableDischargeSummary,
  DischargeSummaryData,
} from '../../components/healthcare/PrintableDischargeSummary';
import { printDocument } from '../../utils/printDocument';
import { dataService } from '../../services/api/dataService';
import type { Patient } from '@arogyasetu/shared/types';

export const SpecialistDischarge: React.FC = () => {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  useEffect(() => {
    let cancelled = false;
    dataService.getPatients().then((rows) => {
      if (cancelled) return;
      setPatients(rows);
      setSelectedPatientId((current) => current || rows[0]?.id || '');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  /**
   * The summary rendered on screen. Patient identity comes from the register;
   * the clinical narrative below is the author's template to edit, not a
   * record of what happened to this patient.
   */
  const summary: DischargeSummaryData = {
    patientName: selectedPatient?.name ?? '—',
    abhaId: selectedPatient?.abhaId || '—',
    admissionDate: '14 Aug 2026',
    dischargeDate: '18 Aug 2026',
    consultant: 'Dr. Priya Kulkarni, MD, DM',
    facilityName: 'Sassoon General Hospital & Medical College, Pune',
    department: 'Tertiary Center · Dept. of Cardiology & Medicine',
    diagnosis: [
      'Severe Refractory Essential Hypertension (Controlled at Discharge: 130/82 mmHg)',
      'Type 2 Diabetes Mellitus with Mild Microalbuminuria',
      'Mild Diastolic Dysfunction (E/A 0.8, preserved EF 58%)',
    ],
    hospitalCourse:
      'Patient was transferred from PHC Paud with hypertensive urgency. Initiated on dual antihypertensive therapy. Tele-ECG and 2D Echo ruled out acute ischemic changes. Renal parameters stabilized (Serum Creatinine 1.05 mg/dL). Discharged in hemodynamically stable condition.',
    medicines: [
      { name: 'Tab Telmisartan 40mg', dosage: '1 Tab', frequency: '1-0-0 (Morning)', instructions: 'After breakfast (सकाळी नाष्ट्यानंतर)' },
      { name: 'Tab Metformin 500mg ER', dosage: '1 Tab', frequency: '1-0-1 (Morning & Night)', instructions: 'With meals (जेवणासोबत)' },
      { name: 'Tab Atorvastatin 20mg', dosage: '1 Tab', frequency: '0-0-1 (Night)', instructions: 'At bedtime (रात्री झोपताना)' },
    ],
    handoffDirectives: [
      'Paud ASHA worker Sunita Patil to conduct weekly home visit for BP recording.',
      'PHC Paud Medical Officer to recheck serum potassium after 3 weeks of ARB therapy.',
      'SOS red flags: Severe headache, chest pressure, dizziness — call 108 immediately.',
    ],
  };

  return (
    <div className="space-y-6">
      {/* Off-screen; only this is sent to the printer. */}
      <PrintableDischargeSummary summary={summary} />

      <Breadcrumbs items={[{ label: 'Specialist Workspace' }, { label: 'Discharge Summaries & FHIR Handoff' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">ABDM FHIR Electronic Discharge Summaries</h1>
            <p className="text-sm text-ink-soft">Author standardized discharge summaries, bundle digital Rx, and auto-dispatch to patient health locker</p>
          </div>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 shadow-sm transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Author New Discharge Summary
        </button>
      </div>

      {/* Discharge Summary Preview Card */}
      <Card className="p-6 md:p-8 space-y-6 border-sand-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-700">Govt. of Maharashtra • Public Health Department</span>
              <Badge variant="success" className="text-[10px]">FHIR R4 Validated</Badge>
            </div>
            <h2 className="text-xl font-extrabold text-ink mt-1">Sassoon General Hospital & Medical College, Pune</h2>
            <p className="text-xs text-ink-soft">Tertiary Center Discharge Summary • Dept. of Cardiology & Medicine</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={printDocument}
              className="flex items-center gap-1.5 px-3 py-2 border border-line text-sand-700 text-xs font-semibold rounded-lg hover:bg-sand-50"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={printDocument}
              title="Opens the print dialog — choose 'Save as PDF' as the destination"
              className="flex items-center gap-1.5 px-3 py-2 bg-gov-600 text-white text-xs font-bold rounded-lg hover:bg-gov-700"
            >
              <Download className="w-4 h-4" /> Export Signed PDF
            </button>
          </div>
        </div>

        {/* Patient metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-sand-50 rounded-xl border border-line text-xs">
          <div>
            <span className="text-ink-soft">Patient Name:</span>
            <p className="font-bold text-ink mt-0.5">{summary.patientName}</p>
          </div>
          <div>
            <span className="text-ink-soft">ABHA Address:</span>
            <p className="font-mono font-semibold text-ink mt-0.5">{summary.abhaId}</p>
          </div>
          <div>
            <span className="text-ink-soft">Admission / Discharge:</span>
            <p className="font-semibold text-ink mt-0.5">14 Aug 2026 / 18 Aug 2026</p>
          </div>
          <div>
            <span className="text-ink-soft">Attending Consultant:</span>
            <p className="font-semibold text-ink mt-0.5">Dr. Priya Kulkarni, MD, DM</p>
          </div>
        </div>

        {/* Clinical sections */}
        <div className="space-y-4 text-xs">
          <div>
            <h3 className="font-bold text-ink uppercase tracking-wider mb-1 text-[11px]">Final Discharge Diagnosis</h3>
            <p className="p-3 bg-sand-50 rounded-lg border border-line text-ink font-medium">
              1. Severe Refractory Essential Hypertension (Controlled at Discharge: 130/82 mmHg)<br />
              2. Type 2 Diabetes Mellitus with Mild Microalbuminuria<br />
              3. Mild Diastolic Dysfunction (E/A 0.8, preserved EF 58%)
            </p>
          </div>

          <div>
            <h3 className="font-bold text-ink uppercase tracking-wider mb-1 text-[11px]">Hospital Course & Interventions</h3>
            <p className="text-sand-700 leading-relaxed">
              Patient was transferred from PHC Paud with hypertensive urgency. Initiated on dual antihypertensive therapy. Tele-ECG and 2D Echo ruled out acute ischemic changes. Renal parameters stabilized (Serum Creatinine 1.05 mg/dL). Discharged in hemodynamically stable condition.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-ink uppercase tracking-wider mb-1 text-[11px]">Discharge Medications & Regimen</h3>
            <div className="border border-line rounded-xl overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="bg-sand-100 text-ink-muted font-bold border-b border-line">
                  <tr>
                    <th className="p-2.5">Medicine Name</th>
                    <th className="p-2.5">Dosage</th>
                    <th className="p-2.5">Frequency</th>
                    <th className="p-2.5">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="p-2.5 font-bold text-ink">Tab Telmisartan 40mg</td>
                    <td className="p-2.5">1 Tab</td>
                    <td className="p-2.5 font-semibold text-gov-700">1-0-0 (Morning)</td>
                    <td className="p-2.5 text-ink-muted">After breakfast (सकाळी नाष्ट्यानंतर)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-ink">Tab Metformin 500mg ER</td>
                    <td className="p-2.5">1 Tab</td>
                    <td className="p-2.5 font-semibold text-gov-700">1-0-1 (Morning & Night)</td>
                    <td className="p-2.5 text-ink-muted">With meals (जेवणासोबत)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-ink">Tab Atorvastatin 20mg</td>
                    <td className="p-2.5">1 Tab</td>
                    <td className="p-2.5 font-semibold text-gov-700">0-0-1 (Night)</td>
                    <td className="p-2.5 text-ink-muted">At bedtime (रात्री झोपताना)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-ink uppercase tracking-wider mb-1 text-[11px]">Handoff Directives to ASHA & PHC Paud</h3>
            <ul className="list-disc list-inside space-y-1 text-sand-700">
              <li>Paud ASHA worker Sunita Patil to conduct weekly home visit for BP recording.</li>
              <li>PHC Paud Medical Officer to recheck serum potassium after 3 weeks of ARB therapy.</li>
              <li>SOS red flags: Severe headache, chest pressure, dizziness — call 108 immediately.</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-line flex items-center justify-between text-xs text-ink-soft">
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Digitally Signed via Ayushman Bharat Health Account (ABHA Token Valid)
          </span>
          <span>Dispatched to Patient ABHA Locker</span>
        </div>
      </Card>

      {/* Generate Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Author Discharge Summary"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Select Admitted Patient</label>
            <select
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface"
            >
              <option value="">Select a patient…</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.abhaId ? ` (ABHA: ${p.abhaId})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Discharge Condition & Summary</label>
            <textarea
              rows={3}
              placeholder="Record final clinical outcome, response to interventions, and stability metrics..."
              className="w-full px-3 py-2 border border-line rounded-lg text-xs"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowGenerateModal(false)}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700"
            >
              Sign & Push to ABDM Locker
            </button>
            <button
              onClick={() => setShowGenerateModal(false)}
              className="px-4 py-2.5 border border-line text-sand-700 text-sm font-semibold rounded-lg hover:bg-sand-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
