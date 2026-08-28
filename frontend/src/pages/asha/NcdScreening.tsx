import React, { useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { dataService } from '../../services/api/dataService';
import { Referral } from '../../types';

export const AshaNcdScreeningPage: React.FC = () => {
  const [patientName, setPatientName] = useState('Vandana Suresh Jadhav');
  const [age, setAge] = useState(45);
  const [gender, setGender] = useState('female');
  const [smokeTobacco, setSmokeTobacco] = useState(false);
  const [alcohol, setAlcohol] = useState(false);
  const [waist, setWaist] = useState(86); // cm
  const [physicalActivity, setPhysicalActivity] = useState(true);
  const [familyHistory, setFamilyHistory] = useState(true);

  const [bpSystolic, setBpSystolic] = useState(148);
  const [bpDiastolic, setBpDiastolic] = useState(94);
  const [bloodSugar, setBloodSugar] = useState(182);

  const [oralLesion, setOralLesion] = useState(false);
  const [breastLump, setBreastLump] = useState(false);
  const [cervicalDischarge, setCervicalDischarge] = useState(false);

  const [isSubmitted, setIsSubmitted] = useState(false);

  // Calculate CBAC score
  let cbacScore = 0;
  if (age >= 50) cbacScore += 2;
  else if (age >= 40) cbacScore += 1;

  if (smokeTobacco) cbacScore += 2;
  if (alcohol) cbacScore += 1;
  if (waist >= 90 && gender === 'male') cbacScore += 2;
  if (waist >= 80 && gender === 'female') cbacScore += 2;
  if (!physicalActivity) cbacScore += 1;
  if (familyHistory) cbacScore += 2;

  const requiresReferral = cbacScore >= 4 || bpSystolic >= 140 || bloodSugar >= 160 || oralLesion || breastLump;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresReferral) {
      const ref: Referral = {
        id: 'ref-ncd-' + Date.now(),
        referralCode: 'REF-NCD-' + Math.floor(1000 + Math.random() * 9000),
        patientId: 'pat-105',
        patientName,
        patientAge: age,
        patientGender: gender,
        referringFacilityId: 'fac-phc-paud',
        referringFacilityName: 'PHC Paud Subcenter',
        referringDoctorName: 'Sunita Gaikwad (ASHA)',
        targetFacilityId: 'fac-phc-paud',
        targetFacilityName: 'PHC Paud NCD Clinic',
        specialty: 'Non-Communicable Diseases (NCD)',
        priority: bpSystolic >= 160 ? 'high' : 'moderate',
        status: 'created',
        provisionalDiagnosis: `CBAC Score ${cbacScore} • Elevated BP (${bpSystolic}/${bpDiastolic}) • RBS ${bloodSugar} mg/dL`,
        clinicalSummary: `CBAC Screening completed. Risk factors: Family history, elevated blood pressure, random blood glucose 182 mg/dL. Medical Officer consultation required for confirmatory testing and initiation of therapy.`,
        aiPriorityScore: 78,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [
          { status: 'created', timestamp: new Date().toISOString(), note: 'CBAC screening form submitted by ASHA', updatedBy: 'Sunita Gaikwad' },
        ],
      };
      await dataService.createReferral(ref);
    }
    setIsSubmitted(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'NCD CBAC Population Screening Form (30+ Years)' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <Activity className="w-6 h-6 text-gov-700" />
          Community Based Assessment Checklist (CBAC) for NCDs
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          National Programme for Prevention & Control of Cancer, Diabetes, CVD and Stroke (NPCDCS)
        </p>
      </div>

      {isSubmitted ? (
        <div className="bg-surface rounded-2xl border border-line p-8 shadow-card text-center space-y-4 animate-in fade-in">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-ink">
            CBAC Screening Form Logged Successfully!
          </h2>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            Calculated CBAC Score: <strong>{cbacScore}</strong>. Patient {patientName} has been flagged and an automatic NCD referral has been routed to the PHC Paud Medical Officer queue.
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setIsSubmitted(false);
              setPatientName('');
            }}
          >
            Screen Next Citizen
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-6">
          {/* Section 1: Demographics */}
          <div>
            <h3 className="font-bold text-ink text-sm uppercase tracking-wider mb-3">
              1. Individual Demographics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Citizen Name"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
              <Input
                label="Age (Years)"
                type="number"
                required
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || 0)}
              />
              <div>
                <label className="block text-xs font-semibold text-sand-700 mb-1.5">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface focus:outline-none focus:border-gov-600"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Part A Risk Score */}
          <div className="space-y-3 pt-2 border-t border-line">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider">
                2. Part A: Risk Factor Assessment Score
              </h3>
              <span className="text-xs font-bold text-gov-800 bg-gov-50 px-3 py-1 rounded-full border border-gov-200">
                Current CBAC Score: {cbacScore} {cbacScore >= 4 ? '(High Risk >= 4)' : '(Low Risk < 4)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
              <label className="p-3 bg-sand-50 border border-line rounded-xl flex items-center justify-between cursor-pointer text-xs">
                <span>Tobacco Use (Smoking, Khaini, Gutkha)</span>
                <input
                  type="checkbox"
                  checked={smokeTobacco}
                  onChange={(e) => setSmokeTobacco(e.target.checked)}
                  className="rounded text-gov-700 w-4 h-4"
                />
              </label>

              <label className="p-3 bg-sand-50 border border-line rounded-xl flex items-center justify-between cursor-pointer text-xs">
                <span>Alcohol Consumption Weekly</span>
                <input
                  type="checkbox"
                  checked={alcohol}
                  onChange={(e) => setAlcohol(e.target.checked)}
                  className="rounded text-gov-700 w-4 h-4"
                />
              </label>

              <label className="p-3 bg-sand-50 border border-line rounded-xl flex items-center justify-between cursor-pointer text-xs">
                <span>Engaged in Physical Activity (&gt;150 mins/week)</span>
                <input
                  type="checkbox"
                  checked={physicalActivity}
                  onChange={(e) => setPhysicalActivity(e.target.checked)}
                  className="rounded text-gov-700 w-4 h-4"
                />
              </label>

              <label className="p-3 bg-sand-50 border border-line rounded-xl flex items-center justify-between cursor-pointer text-xs">
                <span>Family History of Diabetes / High BP / Heart Disease</span>
                <input
                  type="checkbox"
                  checked={familyHistory}
                  onChange={(e) => setFamilyHistory(e.target.checked)}
                  className="rounded text-gov-700 w-4 h-4"
                />
              </label>
            </div>
          </div>

          {/* Section 3: Measurements */}
          <div className="space-y-3 pt-2 border-t border-line">
            <h3 className="font-bold text-ink text-sm uppercase tracking-wider">
              3. Physical Measurements & Clinical Checks
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Systolic BP (mmHg)"
                type="number"
                required
                value={bpSystolic}
                onChange={(e) => setBpSystolic(parseInt(e.target.value) || 0)}
              />
              <Input
                label="Diastolic BP (mmHg)"
                type="number"
                required
                value={bpDiastolic}
                onChange={(e) => setBpDiastolic(parseInt(e.target.value) || 0)}
              />
              <Input
                label="Random Blood Sugar (mg/dL)"
                type="number"
                required
                value={bloodSugar}
                onChange={(e) => setBloodSugar(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Section 4: Warning Sign Checks */}
          <div className="space-y-3 pt-2 border-t border-line">
            <h3 className="font-bold text-ink text-sm uppercase tracking-wider text-red-700 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              4. Common Cancer Early Warning Symptoms
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="p-3 bg-sand-50 border border-line rounded-xl flex items-center justify-between cursor-pointer text-xs">
                <span>Non-healing white/red patch in mouth</span>
                <input
                  type="checkbox"
                  checked={oralLesion}
                  onChange={(e) => setOralLesion(e.target.checked)}
                  className="rounded text-red-600 w-4 h-4"
                />
              </label>

              <label className="p-3 bg-sand-50 border border-line rounded-xl flex items-center justify-between cursor-pointer text-xs">
                <span>Lump or nipple discharge in breast</span>
                <input
                  type="checkbox"
                  checked={breastLump}
                  onChange={(e) => setBreastLump(e.target.checked)}
                  className="rounded text-red-600 w-4 h-4"
                />
              </label>

              <label className="p-3 bg-sand-50 border border-line rounded-xl flex items-center justify-between cursor-pointer text-xs">
                <span>Bleeding between periods / post-menopause</span>
                <input
                  type="checkbox"
                  checked={cervicalDischarge}
                  onChange={(e) => setCervicalDischarge(e.target.checked)}
                  className="rounded text-red-600 w-4 h-4"
                />
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-line flex items-center justify-between">
            <div className="text-xs text-ink-soft">
              {requiresReferral ? (
                <span className="text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                  ⚠️ Score &ge; 4: Auto-generates PHC Doctor NCD Referral
                </span>
              ) : (
                <span className="text-emerald-700 font-bold">
                  ✅ Score &lt; 4: Routine Annual Follow-up
                </span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
              className="font-bold bg-gov-700 hover:bg-gov-800"
            >
              Submit CBAC Screening Record
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
