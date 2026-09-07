import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import {
  Sparkles,
  Activity,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  PhoneCall,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { VitalsInputGroup } from '../../components/healthcare/VitalsInputGroup';
import { TriageBadge } from '../../components/healthcare/TriageBadge';
import { analyzeTriage, TriageResult } from '@arogyasetu/shared/services/ai';
import { Vitals } from '@arogyasetu/shared/types';

export const DoctorAITriagePage: React.FC = () => {
  // Starting on a textbook cardiac emergency made every fresh visit read
  // CRITICAL before anything was entered. Start neutral and let the clinician
  // describe the patient in front of them.
  const [symptomInput, setSymptomInput] = useState('');
  const [vitals, setVitals] = useState<Vitals>({ bpSystolic: 120, bpDiastolic: 80, pulse: 78, spo2: 98, temperature: 98.6 });
  const [age, setAge] = useState(35);
  const [isPregnant, setIsPregnant] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  /**
   * Severity styling for the result panel. Presentation only: it reads the
   * risk level the engine already returned and never influences it.
   */
  const VERDICT_TONES = {
    critical: { shell: 'bg-red-50 border-red-200', score: 'text-red-700', dot: 'bg-red-500' },
    high: { shell: 'bg-orange-50 border-orange-200', score: 'text-orange-700', dot: 'bg-orange-500' },
    moderate: { shell: 'bg-amber-50 border-amber-200', score: 'text-amber-700', dot: 'bg-amber-500' },
    low: { shell: 'bg-emerald-50 border-emerald-200', score: 'text-emerald-700', dot: 'bg-emerald-500' },
  } as const;

  const verdictTone = result
    ? VERDICT_TONES[result.riskLevel as keyof typeof VERDICT_TONES] ?? VERDICT_TONES.low
    : VERDICT_TONES.low;

  // Only the top two tiers make dialling an ambulance the dominant action;
  // below that it stays available but visually secondary.
  const isEmergency = result?.riskLevel === 'critical' || result?.riskLevel === 'high';

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = symptomInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) {
      setError('Enter at least one symptom before computing triage weights.');
      return;
    }
    // Pregnancy is passed as a symptom so the server's obstetric rules apply.
    const withContext = isPregnant ? [...list, 'pregnant'] : list;

    setError('');
    setIsAnalyzing(true);
    try {
      setResult(await analyzeTriage(withContext, vitals, age));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Triage analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Explainable AI Clinical Triage Analyzer' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-gov-700" />
          Explainable Clinical Decision Support Triage Engine
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Deterministic scoring calibrated against National Health Mission Maharashtra emergency triage guidelines
        </p>
      </div>

      {/* Mandatory Clinician Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Clinical Validation Notice:</strong> This AI system evaluates risk weights and physiological abnormalities to assist clinical prioritization. It is NOT an autonomous diagnostic tool and must be verified by a registered medical practitioner.
        </div>
      </div>

      {/* Input Parameters Form */}
      <form onSubmit={handleAnalyze} className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-5">
        <div>
          <label className="block text-xs font-semibold text-sand-700 mb-1.5">
            Reported Chief Complaints & Physical Symptoms (comma separated)
          </label>
          <textarea
            rows={2}
            value={symptomInput}
            placeholder="e.g. chest pain, breathlessness, high fever since 2 days"
            onChange={(e) => setSymptomInput(e.target.value)}
            className="w-full text-xs border border-sand-300 rounded-xl p-3 focus:outline-none focus:border-gov-600 focus:ring-2 focus:ring-gov-100"
          />
        </div>

        <VitalsInputGroup vitals={vitals} onChange={setVitals} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-line">
          <Input
            label="Patient Age (Years)"
            type="number"
            value={age}
            onChange={(e) => setAge(parseInt(e.target.value) || 0)}
          />
          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 text-xs font-semibold text-sand-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isPregnant}
                onChange={(e) => setIsPregnant(e.target.checked)}
                className="rounded text-gov-700 w-4 h-4"
              />
              <span>Patient is Pregnant (Maternal Scoring)</span>
            </label>
          </div>
          <div className="space-y-3 pt-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {error}
              </div>
            )}
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Sparkles className="w-4 h-4" />}
              className="font-bold bg-gov-700 hover:bg-gov-800 w-full"
              isLoading={isAnalyzing}
            >
              Compute Triage Weights
            </Button>
          </div>
        </div>
      </form>

      {/*
        Result panel.
        The triage computation is untouched — every value below comes straight
        from `result`. What changed is the order it is read in: verdict and
        score first, then the findings that produced them, then the action to
        take. The model's narrative sits last behind a disclosure, because a
        clinician deciding whether to call an ambulance should not have to read
        a paragraph to reach the recommendation.
      */}
      {result && (
        <div className="space-y-4 animate-in fade-in">
          {/* 1. The verdict. Tinted by severity so the state is legible before
              any text is read. */}
          <div className={`rounded-2xl border p-5 sm:p-6 shadow-card ${verdictTone.shell}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2.5 min-w-0">
                <TriageBadge priority={result.riskLevel} size="lg" />
                <h3 className="font-display text-xl sm:text-2xl font-extrabold text-ink leading-tight">
                  {result.primaryConcern}
                </h3>
              </div>

              {/* The score reads as a figure, not a sentence. */}
              <div className="shrink-0 text-right">
                <div className="text-[11px] font-semibold text-ink-soft">Risk score</div>
                <div className="flex items-baseline gap-1 justify-end">
                  <span className={`font-display text-4xl font-extrabold tabular-nums ${verdictTone.score}`}>
                    {result.score}
                  </span>
                  <span className="text-sm font-semibold text-ink-soft">/ 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Why. The same contributing factors, as a scannable list. */}
          <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-card">
            <h4 className="font-display text-base font-bold text-ink">Why this result?</h4>
            <p className="text-xs text-ink-soft mt-0.5">
              {result.contributingFactors.length} corroborating finding
              {result.contributingFactors.length === 1 ? '' : 's'}
            </p>
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {result.contributingFactors.map((factor, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 p-3 bg-raised border border-line rounded-xl text-sm font-medium text-ink"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${verdictTone.dot}`} />
                  <span className="leading-snug">{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. What to do, and the two actions that follow from it. */}
          <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-card">
            <h4 className="font-display text-base font-bold text-ink">Recommended action</h4>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">{result.recommendedAction}</p>

            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              {/* Dialling is a real, irreversible act, so it is only the
                  dominant button when the tier actually warrants it. */}
              <a
                href="tel:108"
                className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-colors ${
                  isEmergency
                    ? 'bg-red-700 hover:bg-red-800 text-white shadow-soft'
                    : 'border border-line-strong text-ink-muted hover:bg-raised'
                }`}
              >
                <PhoneCall className="w-4 h-4 shrink-0" />
                Call 108
              </a>
              <Link
                to="/doctor/patients"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm border border-line-strong text-ink-muted hover:bg-raised transition-colors"
              >
                <Stethoscope className="w-4 h-4 shrink-0" />
                View patient EHR
              </Link>
            </div>
          </div>

          {/* 4. The model's own reasoning, and the disclaimer that qualifies
              it — available, but not in the way of the decision. */}
          {(result.explanation || result.disclaimer) && (
            <details className="group bg-surface rounded-2xl border border-line shadow-card overflow-hidden">
              <summary className="flex items-center justify-between gap-3 p-5 cursor-pointer list-none hover:bg-raised transition-colors">
                <span className="font-display text-sm font-bold text-ink">
                  Detailed explanation
                  {result.aiAssisted && (
                    <span className="ml-2 text-xs font-semibold text-gov-700">AI-assisted</span>
                  )}
                </span>
                <ChevronDown className="w-4 h-4 text-ink-soft shrink-0 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="px-5 pb-5 space-y-3 border-t border-line pt-4">
                {result.explanation && (
                  <p className="text-sm text-ink-muted leading-relaxed">{result.explanation}</p>
                )}
                {result.disclaimer && (
                  <p className="text-xs text-ink-soft italic">{result.disclaimer}</p>
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
