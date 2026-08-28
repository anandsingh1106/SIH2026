import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../../services/api/dataService';
import { Patient, Prescription, PrescribedMedicine, Vitals, Referral } from '../../types';
import { checkPrescriptionSafety, AllergyWarning } from '../../services/ai/drugInteractionChecker';
import { Stethoscope, CheckCircle2, AlertOctagon, Plus, Trash2, Sparkles, Pill, FlaskConical, ArrowRightLeft, ShieldCheck, Printer } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { PrintablePrescription } from '../../components/healthcare/PrintablePrescription';
import { printDocument } from '../../utils/printDocument';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { VitalsInputGroup } from '../../components/healthcare/VitalsInputGroup';
import { PatientSummaryCard } from '../../components/healthcare/PatientSummaryCard';
import { ExplainableTriageModal } from '../../components/ai/ExplainableTriageModal';
import confetti from 'canvas-confetti';

export const DoctorConsultationPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('pat-101');
  const [symptoms, setSymptoms] = useState('Persistent morning headache, occasional dizziness, elevated blood pressure at home');
  const [examNotes, setExamNotes] = useState('Chest clear bilaterally, S1S2 heard, no murmur. Mild pedal edema noted. Fundus exam normal.');
  const [diagnosis, setDiagnosis] = useState('Essential Hypertension (Stage 2) with Suboptimal Glycemic Control');
  const [icdCode, setIcdCode] = useState('BA00 (Essential Hypertension)');
  const [vitals, setVitals] = useState<Vitals>({ bpSystolic: 148, bpDiastolic: 94, pulse: 82, spo2: 98, temperature: 98.4, bloodSugarRandom: 188 });
  const [generalAdvice, setGeneralAdvice] = useState(
    'Maintain a low salt and sugar diet. 30 minutes of daily walking. Follow up in 30 days.'
  );
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Prescribed medicines state
  const [medicines, setMedicines] = useState<PrescribedMedicine[]>([
    {
      name: 'Amlodipine 5mg Tablets',
      genericName: 'Amlodipine Besylate 5mg',
      dosage: '5 mg',
      frequency: '1-0-0',
      duration: '30 days',
      instructions: 'Take 1 tablet in the morning after breakfast.',
      instructionsMr: 'दररोज सकाळी नाश्त्यानंतर १ गोळी घ्या.',
      instructionsHi: 'प्रतिदिन सुबह नाश्ते के बाद 1 गोली लें।',
      timing: ['morning'],
      takeWith: 'after_food',
      quantity: 30,
    },
    {
      name: 'Metformin 500mg SR',
      genericName: 'Metformin Hydrochloride 500mg Sustained Release',
      dosage: '500 mg',
      frequency: '1-0-1',
      duration: '30 days',
      instructions: 'Take 1 tablet after breakfast and 1 tablet after dinner.',
      instructionsMr: 'सकाळी जेवणानंतर १ गोळी आणि रात्री जेवणानंतर १ गोळी घ्या.',
      instructionsHi: 'सुबह भोजन के बाद 1 गोली और रात को भोजन के बाद 1 गोली लें।',
      timing: ['morning', 'night'],
      takeWith: 'after_food',
      quantity: 60,
    },
  ]);

  const [allergyWarnings, setAllergyWarnings] = useState<AllergyWarning[]>([]);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [issuedRx, setIssuedRx] = useState<Prescription | null>(null);

  useEffect(() => {
    dataService.getPatients().then(setPatients);
  }, []);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  // Allergy check whenever medicines change
  useEffect(() => {
    if (selectedPatient) {
      const warnings = checkPrescriptionSafety(medicines, selectedPatient);
      setAllergyWarnings(warnings);
    }
  }, [medicines, selectedPatient]);

  const handleAddMedicine = () => {
    const newMed: PrescribedMedicine = {
      name: 'Telmisartan 40mg',
      genericName: 'Telmisartan 40mg Tablets',
      dosage: '40 mg',
      frequency: '1-0-0',
      duration: '30 days',
      instructions: 'Take 1 tablet in morning with water.',
      instructionsMr: 'सकाळी १ गोळी पाण्यासोबत घ्या.',
      instructionsHi: 'सुबह 1 गोली पानी के साथ लें।',
      timing: ['morning'],
      takeWith: 'after_food',
      quantity: 30,
    };
    setMedicines([...medicines, newMed]);
  };

  const handleRemoveMedicine = (idx: number) => {
    setMedicines(medicines.filter((_, i) => i !== idx));
  };

  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    if (medicines.length === 0) {
      setSaveError('Add at least one medicine before issuing the prescription.');
      return;
    }

    setSaveError('');
    setIsSaving(true);

    try {
      // The prescription must reference a real consultation, so record the
      // consultation first and use the id the server returns.
      const consultation = await dataService.saveConsultation({
        patientId: selectedPatient.id,
        chiefComplaint: symptoms,
        symptoms: symptoms.split(',').map((s) => s.trim()).filter(Boolean),
        examination: examNotes,
        diagnosis,
        // The field often holds "BA00 (Essential Hypertension)"; the API stores
        // the code alone, so take the leading token.
        icdCode: icdCode.trim().split(/[\s(]/)[0].slice(0, 20) || undefined,
        followUpDate,
      });

      // Vitals recorded during the consultation belong on the patient record.
      await dataService
        .recordVitals(selectedPatient.id, vitals, consultation.id)
        .catch(() => undefined);

      const rx: Prescription = {
        id: '',
        consultationId: consultation.id,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        doctorId: '',
        doctorName: '',
        facilityName: '',
        date: new Date().toISOString().substring(0, 10),
        medicines,
        generalAdvice: generalAdvice,
        followUpDate,
      };

      const saved = await dataService.savePrescription({ ...rx, diagnosis } as Prescription);

      // Keep the issued prescription so "Print Prescription Slip" prints it
      // rather than the surrounding page.
      setIssuedRx({ ...rx, ...saved });
      setIsSubmitted(true);
      confetti({ particleCount: 70, spread: 50, origin: { y: 0.6 } });
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not issue the prescription. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Clinical Consultation Workstation' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-gov-700" />
            Clinical Consultation & E-Prescribing Station
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Structured diagnosis, formulary prescription generator, and allergy safety verification
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          leftIcon={<Sparkles className="w-4 h-4 text-gov-700" />}
          onClick={() => setIsTriageModalOpen(true)}
        >
          AI Diagnostic Copilot
        </Button>
      </div>

      {isSubmitted ? (
        <div className="bg-surface rounded-2xl border border-emerald-200 p-8 shadow-card text-center space-y-4 animate-in fade-in">
          {/* Off-screen; only this is sent to the printer. */}
          <PrintablePrescription prescription={issuedRx} />

          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-ink">
            Consultation & E-Prescription Finalized!
          </h2>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            Prescription generated for <strong>{selectedPatient?.name}</strong>. The digital prescription and trilingual voice audio explanation have been delivered to the patient portal.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={printDocument}
            >
              Print Prescription Slip
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsSubmitted(false);
                navigate('/doctor/queue');
              }}
            >
              Call Next Queue Patient →
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCompleteConsultation} className="space-y-6">
          {/* Patient Selector */}
          <div className="bg-surface p-4 rounded-xl border border-line shadow-xs flex items-center gap-3">
            <label className="text-xs font-bold text-sand-700 uppercase tracking-wider shrink-0">
              Active Patient:
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink font-semibold focus:outline-none focus:border-gov-600"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.age}y, {p.village}) — ABHA: {p.abhaId}
                </option>
              ))}
            </select>
          </div>

          {selectedPatient && <PatientSummaryCard patient={selectedPatient} />}

          {/* Allergy Warnings Alert */}
          {allergyWarnings.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 animate-bounce" />
                <span>CRITICAL ALLERGEN CONTRAINDICATION DETECTED</span>
              </div>
              {allergyWarnings.map((w, i) => (
                <p key={i} className="text-xs text-red-700 font-medium pl-7">
                  {w.message}
                </p>
              ))}
            </div>
          )}

          {/* Section 1: Complaints & Vitals */}
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-ink text-sm uppercase tracking-wider">
              1. Chief Complaints & Clinical History
            </h3>
            <textarea
              rows={2}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full text-xs border border-sand-300 rounded-xl p-3 focus:outline-none focus:border-gov-600"
            />
            <VitalsInputGroup vitals={vitals} onChange={setVitals} />
          </div>

          {/* Section 2: Assessment & Diagnosis */}
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-ink text-sm uppercase tracking-wider">
              2. Assessment & Diagnosis (ICD-11 Code)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
              <Input
                label="Provisional / Final Diagnosis"
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
              <Input
                label="ICD-11 Classification Code"
                value={icdCode}
                onChange={(e) => setIcdCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1.5">Physical Examination Findings</label>
              <textarea
                rows={2}
                value={examNotes}
                onChange={(e) => setExamNotes(e.target.value)}
                className="w-full text-xs border border-sand-300 rounded-xl p-3 focus:outline-none focus:border-gov-600"
              />
            </div>
          </div>

          {/* Section 3: E-Prescription Creator */}
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
                <Pill className="w-4 h-4 text-gov-700" />
                3. Formulary E-Prescription & Dosage Schedule
              </h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddMedicine}
              >
                Add Medicine
              </Button>
            </div>

            <div className="space-y-3">
              {medicines.map((med, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-sand-50 border border-line rounded-xl space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink text-sm">
                      #{idx + 1}. {med.name} ({med.genericName})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicine(idx)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Input
                      label="Dosage"
                      value={med.dosage}
                      onChange={(e) => {
                        const m = [...medicines];
                        m[idx].dosage = e.target.value;
                        setMedicines(m);
                      }}
                    />
                    <Input
                      label="Frequency"
                      value={med.frequency}
                      placeholder="1-0-1"
                      onChange={(e) => {
                        const m = [...medicines];
                        m[idx].frequency = e.target.value;
                        setMedicines(m);
                      }}
                    />
                    <Input
                      label="Duration"
                      value={med.duration}
                      placeholder="30 days"
                      onChange={(e) => {
                        const m = [...medicines];
                        m[idx].duration = e.target.value;
                        setMedicines(m);
                      }}
                    />
                    <Input
                      label="Quantity (Units)"
                      type="number"
                      value={med.quantity}
                      onChange={(e) => {
                        const m = [...medicines];
                        m[idx].quantity = parseInt(e.target.value) || 0;
                        setMedicines(m);
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
                    <Input
                      label="Instructions (English)"
                      value={med.instructions}
                      onChange={(e) => {
                        const m = [...medicines];
                        m[idx].instructions = e.target.value;
                        setMedicines(m);
                      }}
                    />
                    <Input
                      label="मराठी सूचना (Audio Text)"
                      value={med.instructionsMr}
                      onChange={(e) => {
                        const m = [...medicines];
                        m[idx].instructionsMr = e.target.value;
                        setMedicines(m);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          {saveError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {saveError}
            </div>
          )}

          <div className="pt-4 border-t border-line flex items-center justify-between">
            <span className="text-xs text-ink-soft">
              Prescription digitally signed & linked to ABHA Record
            </span>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
              className="font-bold bg-gov-700 hover:bg-gov-800"
              isLoading={isSaving}
            >
              Sign & Issue E-Prescription
            </Button>
          </div>
        </form>
      )}

      {/* AI Triage Modal */}
      <ExplainableTriageModal
        isOpen={isTriageModalOpen}
        onClose={() => setIsTriageModalOpen(false)}
        initialSymptoms={[symptoms]}
        initialVitals={vitals}
        onApplyAssessment={(res) => {
          setDiagnosis(res.primaryConcern);
        }}
      />
    </div>
  );
};
