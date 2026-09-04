import React, { useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { dataService } from '../../services/api/dataService';
import type { NcdScreening, Patient } from '@arogyasetu/shared/types';

export const AshaNcdScreeningPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The saved screening, carrying the server's CBAC assessment. */
  const [result, setResult] = useState<NcdScreening | null>(null);

  useEffect(() => {
    let cancelled = false;
    dataService.getPatients().then((rows) => {
      if (cancelled) return;
      setPatients(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId),
    [patients, patientId]
  );

  // Selecting a patient carries their recorded age and sex into the form, so
  // the screening is scored against the register rather than retyped values.
  useEffect(() => {
    if (!selectedPatient) return;
    if (selectedPatient.age) setAge(selectedPatient.age);
    if (selectedPatient.gender) setGender(selectedPatient.gender);
  }, [selectedPatient]);

  /**
   * A local preview of whether this screening will trip the referral
   * threshold, used only to warn the worker before they submit. The
   * authoritative CBAC score, risk category and recommendations are computed
   * server-side against the published NPCDCS scoring and read back from the
   * saved record — scoring the same form in two places is how the two copies
   * drift apart.
   */
  const likelyNeedsReferral =
    bpSystolic >= 140 || bpDiastolic >= 90 || bloodSugar >= 140 ||
    oralLesion || breastLump || cervicalDischarge;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      setError('Select the citizen being screened.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await dataService.createNcdScreening({
        patientId,
        age,
        bloodPressureSystolic: bpSystolic,
        bloodPressureDiastolic: bpDiastolic,
        bloodGlucose: bloodSugar,
        waistCircumference: waist,
        tobaccoUse: smokeTobacco,
        alcoholUse: alcohol,
        physicalActivityAdequate: physicalActivity,
        familyHistory,
      });
      setResult(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the screening. Try again.');
    } finally {
      setSaving(false);
    }
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

      {result ? (
        <div className="bg-surface rounded-2xl border border-line p-8 shadow-card space-y-4 animate-in fade-in">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-ink">CBAC screening recorded</h2>
            <p className="text-xs text-ink-muted max-w-md">
              {result.patientName ?? selectedPatient?.name} screened on{' '}
              {new Date(result.date).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
              .
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="px-4 py-2 bg-sand-50 border border-line rounded-xl text-center">
              <p className="text-[10px] font-bold uppercase text-ink-soft">CBAC Score</p>
              <p className="text-2xl font-bold text-ink">{result.cbacScore ?? '—'}</p>
            </div>
            {result.riskCategory && (
              <Badge
                variant={
                  result.riskCategory === 'HIGH'
                    ? 'danger'
                    : result.riskCategory === 'MODERATE'
                    ? 'warning'
                    : 'success'
                }
              >
                {result.riskCategory} RISK
              </Badge>
            )}
            {result.suspectedHypertension && <Badge variant="warning">Suspected hypertension</Badge>}
            {result.suspectedDiabetes && <Badge variant="warning">Suspected diabetes</Badge>}
          </div>

          {result.recommendations?.length > 0 && (
            <div className="bg-sand-50 border border-line rounded-xl p-4">
              <p className="text-xs font-bold text-ink mb-2">Recommended actions</p>
              <ul className="space-y-1.5">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-ink-soft flex gap-2">
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gov-700" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-ink-muted text-center">
            This is a screening score, not a diagnosis. Confirmatory testing is done by the medical
            officer.
          </p>

          <div className="flex justify-center">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setResult(null);
                setPatientId('');
              }}
            >
              Screen Next Citizen
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-6">
          {/* Section 1: Demographics */}
          <div>
            <h3 className="font-bold text-ink text-sm uppercase tracking-wider mb-3">
              1. Individual Demographics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-sand-700 mb-1">
                  Citizen <span className="text-red-600">*</span>
                </label>
                <select
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface"
                >
                  <option value="">Select a registered patient…</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.village ? ` — ${p.village}` : ''}
                      {p.age ? ` (${p.age})` : ''}
                    </option>
                  ))}
                </select>
              </div>
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
                Scored on submit
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

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-line flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs text-ink-soft">
              {likelyNeedsReferral ? (
                <span className="text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded border border-amber-200 inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Measured values are above screening thresholds
                </span>
              ) : (
                <span className="text-ink-soft">
                  The CBAC score is calculated when the screening is saved.
                </span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={saving}
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
              className="font-bold bg-gov-700 hover:bg-gov-800"
            >
              {saving ? 'Saving…' : 'Submit CBAC Screening Record'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
