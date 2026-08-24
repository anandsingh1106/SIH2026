import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/api/dataService';
import { Patient, HomeVisit, Vitals, Referral } from '../../types';
import { Home, User, CheckCircle2, AlertTriangle, ArrowRightLeft, Calendar, Stethoscope, Heart } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { VitalsInputGroup } from '../../components/healthcare/VitalsInputGroup';
import { PatientSummaryCard } from '../../components/healthcare/PatientSummaryCard';

export const AshaHomeVisitsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pat-102');
  const [vitals, setVitals] = useState<Vitals>({ bpSystolic: 138, bpDiastolic: 88, pulse: 90, spo2: 97, temperature: 98.6 });
  const [observations, setObservations] = useState('');
  const [selectedDangerSigns, setSelectedDangerSigns] = useState<string[]>(['Severe Pallor (Hb < 8 g/dL)', 'Pedal Edema']);
  const [createReferral, setCreateReferral] = useState(true);
  const [nextVisitDate, setNextVisitDate] = useState('2026-08-30');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    dataService.getPatients().then(setPatients);
  }, []);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const dangerSignsList = [
    'Severe Pallor (Hb < 8 g/dL)',
    'Elevated BP (>= 140/90 mmHg)',
    'Severe Headache / Blurred Vision',
    'Pedal Edema (Swelling in feet)',
    'High Fever with Chills',
    'Vaginal Bleeding / Spotting',
    'Reduced Fetal Movements',
    'Breathlessness at Rest',
  ];

  const toggleDangerSign = (sign: string) => {
    if (selectedDangerSigns.includes(sign)) {
      setSelectedDangerSigns(selectedDangerSigns.filter((s) => s !== sign));
    } else {
      setSelectedDangerSigns([...selectedDangerSigns, sign]);
    }
  };

  const handleRecordVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const newVisit: HomeVisit = {
      id: 'visit-' + Date.now(),
      ashaId: 'usr-asha-1',
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      date: new Date().toISOString().substring(0, 10),
      vitals,
      observations: observations || 'Conducted standard maternal & vital monitoring.',
      dangerSignsIdentified: selectedDangerSigns,
      screeningOutcome: selectedDangerSigns.length > 0 ? 'High Risk Identified' : 'Normal',
      referralRecommended: createReferral,
      notes: observations,
      nextVisitDate,
      syncStatus: 'pending',
    };

    await dataService.recordHomeVisit(newVisit);

    if (createReferral) {
      const ref: Referral = {
        id: 'ref-' + Date.now(),
        referralCode: 'REF-MH-PUN-' + Math.floor(1000 + Math.random() * 9000),
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientAge: selectedPatient.age,
        patientGender: selectedPatient.gender,
        referringFacilityId: 'fac-phc-paud',
        referringFacilityName: 'PHC Paud Subcenter',
        referringDoctorName: 'Sunita Gaikwad (ASHA) / Dr. Deshmukh',
        targetFacilityId: 'fac-gmc-sassoon',
        targetFacilityName: 'B.J. Govt Medical College & Sassoon General Hospital',
        specialty: 'Obstetrics & High-Risk Pregnancy',
        priority: selectedDangerSigns.length > 0 ? 'critical' : 'moderate',
        status: 'created',
        provisionalDiagnosis: 'High-Risk Maternal Symptoms identified during home visit',
        clinicalSummary: `Identified danger signs: ${selectedDangerSigns.join(', ')}. Systolic BP: ${vitals.bpSystolic} mmHg. Immediate hospital review advised.`,
        aiPriorityScore: 92,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [
          { status: 'created', timestamp: new Date().toISOString(), note: 'Referral generated from ASHA home visit', updatedBy: 'Sunita Gaikwad' },
        ],
      };
      await dataService.createReferral(ref);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Record Patient Home Visit' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Home className="w-6 h-6 text-gov-700" />
          Grassroots Home Visit & Health Observation Station
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Record longitudinal vital signs, maternal danger signs, and generate 1-click tele-referrals offline
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            <strong>Home Visit Saved Offline!</strong> Observations and referral queued in local IndexedDB.
          </span>
        </div>
      )}

      {/* Select Patient Dropdown */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">
          Select Patient:
        </label>
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 font-semibold focus:outline-none focus:border-gov-600"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.village}) — ABHA: {p.abhaId}
            </option>
          ))}
        </select>
      </div>

      {/* Patient Summary Header */}
      {selectedPatient && <PatientSummaryCard patient={selectedPatient} />}

      {/* Visit Recording Form */}
      <form onSubmit={handleRecordVisit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Vitals Recording */}
        <div>
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-3">
            1. Record Measured Vital Signs
          </h3>
          <VitalsInputGroup vitals={vitals} onChange={setVitals} />
        </div>

        {/* Danger Signs Checklist */}
        <div>
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            2. Red-Flag Danger Signs Checklist (National Health Mission)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {dangerSignsList.map((sign) => {
              const isChecked = selectedDangerSigns.includes(sign);
              return (
                <label
                  key={sign}
                  className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors flex items-center gap-2.5 ${
                    isChecked
                      ? 'bg-red-50 text-red-900 border-red-300 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleDangerSign(sign)}
                    className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                  />
                  <span>{sign}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Clinical Observations & Counselling Notes */}
        <div>
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-2">
            3. ASHA Field Observations & Nutrition Guidance
          </h3>
          <textarea
            rows={3}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="e.g. Counseled on taking 2 IFA tablets daily with lemon water. Verified 108 ambulance transport arrangements."
            className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-gov-600 focus:ring-2 focus:ring-gov-100"
          />
        </div>

        {/* Referral Option & Follow-up */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <label className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={createReferral}
              onChange={(e) => setCreateReferral(e.target.checked)}
              className="rounded text-gov-700 w-4 h-4 focus:ring-gov-500"
            />
            <div>
              <span className="font-bold text-amber-900 block">Trigger Tele-Referral to Hospital</span>
              <span className="text-amber-700">Auto-routes to Doctor Queue & reserves tertiary bed</span>
            </div>
          </label>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Scheduled Next Follow-up Visit</label>
            <input
              type="date"
              value={nextVisitDate}
              onChange={(e) => setNextVisitDate(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:border-gov-600"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            leftIcon={<CheckCircle2 className="w-5 h-5" />}
            className="font-bold bg-gov-700 hover:bg-gov-800"
          >
            Save Home Visit Offline
          </Button>
        </div>
      </form>
    </div>
  );
};
