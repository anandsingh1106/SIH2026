import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/api/dataService';
import { Prescription } from '../../types';
import { Pill, Search, Printer, Volume2, User, Plus, Calendar, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { AudioPrescriptionPlayer } from '../../components/healthcare/AudioPrescriptionPlayer';
import { PrintablePrescription } from '../../components/healthcare/PrintablePrescription';
import { printDocument } from '../../utils/printDocument';
import { useNavigate } from 'react-router-dom';

export const DoctorPrescriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dataService.getPrescriptions().then((list) => {
      setPrescriptions(list);
      if (list.length > 0) setSelectedRx(list[0]);
    });
  }, []);

  const filtered = prescriptions.filter((rx) => {
    return (
      rx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Off-screen; only this is sent to the printer. */}
      <PrintablePrescription prescription={selectedRx} />

      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Formulary E-Prescriptions & Audio Synthesizer' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Pill className="w-6 h-6 text-gov-700" />
            Digital E-Prescriptions & Voice Audio Library
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Formulary-verified digital prescriptions with automatic trilingual Marathi/Hindi speech synthesis
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/doctor/consultation')}
        >
          Write New Prescription
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <SearchInput
          placeholder="Search prescriptions by Patient Name or Rx Token ID..."
          onChange={setSearchQuery}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Prescriptions List (Left 4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Issued Prescriptions ({filtered.length})
          </h3>

          <div className="space-y-2.5">
            {filtered.map((rx) => {
              const isSelected = selectedRx?.id === rx.id;
              return (
                <div
                  key={rx.id}
                  onClick={() => setSelectedRx(rx)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gov-50/60 border-gov-600 shadow-xs font-semibold'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{rx.patientName}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{rx.date}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {rx.medicines.length} Medicines Prescribed
                  </div>
                  <div className="text-[11px] text-gov-800 font-mono mt-1">
                    Token: {rx.id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Prescription Details & Audio Player (Right 8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedRx ? (
            <div className="space-y-4">
              {/* Audio Synthesizer */}
              <AudioPrescriptionPlayer
                patientName={selectedRx.patientName}
                doctorName={selectedRx.doctorName}
                facilityName={selectedRx.facilityName}
                date={selectedRx.date}
                medicines={selectedRx.medicines}
                generalAdvice={selectedRx.generalAdvice}
                generalAdviceMr={selectedRx.generalAdviceMr}
                generalAdviceHi={selectedRx.generalAdviceHi}
              />

              {/* Printable Prescription Slip */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 print-card">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Government of Maharashtra E-Prescription</h3>
                    <p className="text-xs text-slate-500">{selectedRx.facilityName} • Outpatient Department</p>
                  </div>
                  <div className="flex items-center gap-2 no-print">
                    <Button size="sm" variant="outline" leftIcon={<Printer className="w-3.5 h-3.5" />} onClick={printDocument}>
                      Print Slip
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500">Patient:</span>
                    <div className="font-bold text-slate-900">{selectedRx.patientName}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Prescribing Doctor:</span>
                    <div className="font-bold text-slate-900">{selectedRx.doctorName}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Date Issued:</span>
                    <div className="font-bold text-slate-900">{selectedRx.date}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Next Follow-up:</span>
                    <div className="font-bold text-gov-800">{selectedRx.followUpDate || '30 Days'}</div>
                  </div>
                </div>

                {/* Medicines List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Prescribed Medication Formulations:
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Medicine & Generic Name</th>
                          <th className="p-3">Dosage</th>
                          <th className="p-3">Schedule</th>
                          <th className="p-3">Duration</th>
                          <th className="p-3">Instructions (मराठी / English)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {(selectedRx.medicines ?? []).map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{m.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{m.genericName}</div>
                            </td>
                            <td className="p-3 font-bold text-gov-800">{m.dosage}</td>
                            <td className="p-3 font-bold text-slate-900">{m.frequency}</td>
                            <td className="p-3 text-slate-600">{m.duration}</td>
                            <td className="p-3 text-slate-700">
                              <div>{m.instructions}</div>
                              {m.instructionsMr && (
                                <div className="text-[11px] text-gov-800 font-semibold mt-0.5">{m.instructionsMr}</div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedRx.generalAdvice && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-slate-800">Doctor's Dietary & Lifestyle Advice:</div>
                    <p className="text-slate-600">{selectedRx.generalAdvice}</p>
                    {selectedRx.generalAdviceMr && (
                      <p className="text-gov-800 font-medium">{selectedRx.generalAdviceMr}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              Select a prescription to review details and listen to the voice audio guide.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
