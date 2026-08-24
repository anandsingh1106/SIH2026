import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../../services/api/dataService';
import { Patient } from '../../types';
import { FileText, Search, User, Clock, AlertOctagon, Pill, FlaskConical, Stethoscope, ArrowRight } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PatientSummaryCard } from '../../components/healthcare/PatientSummaryCard';

export const DoctorPatientRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    dataService.getPatients().then((list) => {
      setPatients(list);
      if (list.length > 0) setSelectedPatient(list[0]);
    });
  }, []);

  const filtered = patients.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.abhaId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery)
    );
  });

  const timelineEvents = [
    { date: '2026-08-20', title: 'Hypertension & Diabetes Follow-up', type: 'consultation', doctor: 'Dr. Rajesh Deshmukh', notes: 'Blood pressure 146/94 mmHg, RBS 188 mg/dL. Prescribed Amlodipine 5mg & Metformin 500mg SR.' },
    { date: '2026-08-21', title: 'Diagnostic Lab: HbA1c & Serum Creatinine', type: 'lab', doctor: 'PHC Paud Lab', notes: 'HbA1c: 7.4% (Suboptimal glycemic control). Serum Creatinine: 1.0 mg/dL (Normal renal profile).' },
    { date: '2026-01-15', title: 'Initial PHC Paud Enrollment & Baseline Screening', type: 'registration', doctor: 'Sunita Gaikwad (ASHA)', notes: 'Registered under ABHA ID. Penicillin & Sulfa allergy recorded.' },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Longitudinal EHR & Patient Health Records' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-gov-700" />
          Longitudinal Electronic Health Records (EHR)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Unified patient health histories anchored on Ayushman Bharat Health Account (ABHA) IDs
        </p>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <SearchInput
          placeholder="Search patient by Name, 14-digit ABHA ID, or Phone..."
          onChange={setSearchQuery}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Patient Selection List (Left 4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Patient Registry ({filtered.length})
          </h3>

          <div className="space-y-2">
            {filtered.map((p) => {
              const isSelected = selectedPatient?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gov-50/60 border-gov-600 shadow-xs font-semibold'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{p.name}</span>
                    <Badge variant={p.riskCategory === 'critical' ? 'critical' : p.riskCategory === 'high' ? 'danger' : 'primary'} size="sm">
                      {p.riskCategory.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">ABHA: {p.abhaId}</div>
                  <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                    <span>{p.age} Yrs / {p.gender}</span>
                    <span>{p.village}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Longitudinal History Timeline (Right 8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedPatient ? (
            <div className="space-y-4">
              <PatientSummaryCard patient={selectedPatient} />

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gov-700" />
                    Longitudinal Care Timeline & Historical Consultations
                  </h3>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Stethoscope className="w-3.5 h-3.5" />}
                    onClick={() => navigate('/doctor/consultation')}
                  >
                    Start Consultation for {selectedPatient.name.split(' ')[0]}
                  </Button>
                </div>

                {/* Timeline Feed */}
                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                  {timelineEvents.map((evt, idx) => (
                    <div key={idx} className="relative flex items-start gap-4 pl-8">
                      <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-gov-700 border-2 border-white shadow-2xs" />
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-full space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{evt.title}</span>
                          <span className="text-[11px] text-slate-400 font-semibold">{evt.date}</span>
                        </div>
                        <div className="text-[11px] text-gov-800 font-medium">{evt.doctor}</div>
                        <p className="text-slate-600 leading-relaxed">{evt.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              Select a patient record to inspect their complete clinical timeline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
