import React, { useState, useEffect } from 'react';
import { Pill, Download, Printer, Volume2, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { PrintablePrescription } from '../../components/healthcare/PrintablePrescription';
import { printDocument } from '../../utils/printDocument';
import { Prescription } from '../../types';
import { dataService } from '../../services/api/dataService';

export const PatientPrescriptions: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [printTarget, setPrintTarget] = useState<Prescription | null>(null);

  useEffect(() => {
    let cancelled = false;
    dataService
      .getPrescriptions()
      .then((rows) => {
        if (cancelled) return;
        setPrescriptions(rows);
        // Open the most recent one, which is what a patient came to read.
        setExpanded(rows[0]?.id ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);


  const handlePrint = (pres: Prescription) => setPrintTarget(pres);

  // Printing has to wait until the chosen prescription is in the DOM.
  useEffect(() => {
    if (!printTarget) return;
    printDocument();
    setPrintTarget(null);
  }, [printTarget]);

  const TIMING_MAP: Record<string, string> = {
    '1-0-0': 'Morning only',
    '0-1-0': 'Afternoon only',
    '0-0-1': 'Night only',
    '1-0-1': 'Morning & Night',
    '1-1-1': 'Three times daily',
    '1-1-0': 'Morning & Afternoon',
  };

  return (
    <div className="space-y-6">
      {/* Off-screen; only this is sent to the printer. */}
      <PrintablePrescription prescription={printTarget} />

      <Breadcrumbs items={[{ label: 'Patient Portal' }, { label: 'Prescriptions' }]} />

      <div className="flex items-center gap-3">
        <Pill className="w-6 h-6 text-gov-600" />
        <div>
          <h1 className="text-xl font-bold text-ink">My Prescriptions</h1>
          <p className="text-sm text-ink-soft">All your e-prescriptions with detailed instructions</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">Important Reminder</p>
          <p className="text-xs text-amber-700 mt-1">
            Take medicines as prescribed. Do not stop or change doses without consulting your doctor. 
            If you experience side effects, contact your healthcare provider immediately.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {prescriptions.map((pres) => (
          <Card key={pres.id} className="overflow-hidden">
            {/* Prescription Header */}
            <button
              className="w-full p-5 text-left hover:bg-sand-50 transition-colors"
              onClick={() => setExpanded(expanded === pres.id ? null : pres.id)}
              aria-expanded={expanded === pres.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-ink">{pres.date}</p>
                    <Badge variant="info" className="text-xs">Rx #{(pres.id ?? '').split('-').pop()}</Badge>
                  </div>
                  <p className="text-sm text-ink-muted mt-1">{pres.doctorName} · {pres.facilityName}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{pres.medicines.length} medicines prescribed</p>
                </div>
                <div className="flex items-center gap-2">
                  {expanded === pres.id ? (
                    <ChevronUp className="w-5 h-5 text-ink-soft" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-ink-soft" />
                  )}
                </div>
              </div>
            </button>

            {/* Prescription Detail */}
            {expanded === pres.id && (
              <div className="border-t border-line p-5 space-y-5">
                {/* Medicines */}
                <div>
                  <h3 className="text-sm font-bold text-sand-700 mb-3">Medicines</h3>
                  <div className="space-y-3">
                    {pres.medicines.map((med, idx) => (
                      <div key={idx} className="bg-sand-50 rounded-xl p-4 border border-line">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-ink">{med.name}</p>
                            <p className="text-xs text-ink-soft">{med.genericName}</p>
                          </div>
                          <Badge variant="default" className="text-xs shrink-0">{med.dosage}</Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                          <div>
                            <p className="text-xs text-ink-soft font-medium">Schedule</p>
                            <p className="text-xs font-semibold text-sand-700 mt-0.5">
                              {TIMING_MAP[med.frequency] ?? med.frequency}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-ink-soft font-medium">Duration</p>
                            <p className="text-xs font-semibold text-sand-700 mt-0.5">{med.duration}</p>
                          </div>
                          <div>
                            <p className="text-xs text-ink-soft font-medium">When to Take</p>
                            <p className="text-xs font-semibold text-sand-700 mt-0.5">
                              {med.takeWith.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        {med.instructions && (
                          <div className="mt-3 flex items-start gap-2 bg-blue-50 rounded-lg p-2.5">
                            <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-700">{med.instructions}</p>
                          </div>
                        )}
                        {med.instructionsMr && (
                          <p className="text-xs text-ink-soft mt-2 font-medium">{med.instructionsMr}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* General Advice */}
                {pres.generalAdvice && (
                  <div className="bg-gov-50 rounded-xl p-4 border border-gov-100">
                    <p className="text-xs font-bold text-gov-700 mb-1">Doctor's Advice</p>
                    <p className="text-sm text-sand-700">{pres.generalAdvice}</p>
                  </div>
                )}

                {/* Follow-up */}
                {pres.followUpDate && (
                  <div className="flex items-center gap-2 text-sm text-ink-muted">
                    <span className="font-semibold">Next Review:</span>
                    <Badge variant="warning">{pres.followUpDate}</Badge>
                  </div>
                )}

                {/* Warnings */}
                {pres.warnings && pres.warnings.length > 0 && (
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <p className="text-xs font-bold text-red-700 mb-2">Warnings</p>
                    <ul className="space-y-1">
                      {pres.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-red-600 flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 flex-wrap pt-2 border-t border-line">
                  <button className="flex items-center gap-2 px-4 py-2 bg-gov-600 text-white text-xs font-semibold rounded-lg hover:bg-gov-700 transition-colors">
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => handlePrint(pres)}
                    className="flex items-center gap-2 px-4 py-2 border border-line text-sand-700 text-xs font-semibold rounded-lg hover:bg-sand-50 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <a
                    href="/patient/audio-prescription"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                    Audio Explanation
                  </a>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PatientPrescriptions;

