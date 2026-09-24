import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Sparkles, ShieldAlert, PhoneCall, ChevronDown, Calendar, Siren } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { VitalsInputGroup } from '../../components/healthcare/VitalsInputGroup';
import { TriageBadge } from '../../components/healthcare/TriageBadge';
import { analyzeTriage, TriageResult } from '@arogyasetu/shared/services/ai';
import { Vitals } from '@arogyasetu/shared/types';

/**
 * Lets a patient describe how they feel and see how urgently they should get
 * care. It runs the same server-side triage rules the clinical team uses, but
 * only ever points to the next step: call 108, raise an alert, or book a visit.
 */
export const PatientSymptomChecker: React.FC = () => {
  const [symptomInput, setSymptomInput] = useState('');
  // Most patients have no BP cuff or oximeter at home, so readings are opt in.
  // Sending made-up normal values would hide a real problem.
  const [hasVitals, setHasVitals] = useState(false);
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

  // Only the top two tiers make calling an ambulance the main action; below
  // that it stays available but visually secondary.
  const isEmergency = result?.riskLevel === 'critical' || result?.riskLevel === 'high';

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = symptomInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) {
      setError('Please describe at least one symptom.');
      return;
    }
    // Pregnancy is passed as a symptom so the server's obstetric rules apply.
    const withContext = isPregnant ? [...list, 'pregnant'] : list;

    setError('');
    setIsAnalyzing(true);
    try {
      setResult(await analyzeTriage(withContext, hasVitals ? vitals : undefined, age));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check your symptoms. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'My Health', href: '/patient/dashboard' },
          { label: 'AI Symptom Checker' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-gov-700" />
          AI Symptom Checker
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Tell us how you feel and we will tell you how soon you should see a doctor
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>This is not a diagnosis.</strong> It only suggests how urgently you need care. If you feel very
          unwell, have chest pain, trouble breathing or heavy bleeding, call 108 right away.
        </div>
      </div>

      <form onSubmit={handleAnalyze} className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-5">
        <div>
          <label className="block text-xs font-semibold text-sand-700 mb-1.5">
            Your symptoms (separate them with commas)
          </label>
          <textarea
            rows={2}
            value={symptomInput}
            placeholder="e.g. fever since 2 days, headache, body pain"
            onChange={(e) => setSymptomInput(e.target.value)}
            className="w-full text-xs border border-sand-300 rounded-xl p-3 focus:outline-none focus:border-gov-600 focus:ring-2 focus:ring-gov-100"
          />
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-sand-700 cursor-pointer">
          <input
            type="checkbox"
            checked={hasVitals}
            onChange={(e) => setHasVitals(e.target.checked)}
            className="rounded text-gov-700 w-4 h-4"
          />
          <span>I have measured my BP, pulse, oxygen or temperature</span>
        </label>
        {hasVitals && <VitalsInputGroup vitals={vitals} onChange={setVitals} />}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-line">
          <Input
            label="Your age (years)"
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
              <span>I am pregnant</span>
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
              Check My Symptoms
            </Button>
          </div>
        </div>
      </form>

      {/*
        Result panel. Every value comes straight from `result`, read in order:
        how urgent, why, then what to do. The model's narrative sits last
        behind a disclosure, so the next step is never buried under text.
      */}
      {result && (
        <div className="space-y-4 animate-in fade-in">
          <div className={`rounded-2xl border p-5 sm:p-6 shadow-card ${verdictTone.shell}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2.5 min-w-0">
                <TriageBadge priority={result.riskLevel} size="lg" />
                <h3 className="font-display text-xl sm:text-2xl font-extrabold text-ink leading-tight">
                  {result.primaryConcern}
                </h3>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[11px] font-semibold text-ink-soft">Urgency score</div>
                <div className="flex items-baseline gap-1 justify-end">
                  <span className={`font-display text-4xl font-extrabold tabular-nums ${verdictTone.score}`}>
                    {result.score}
                  </span>
                  <span className="text-sm font-semibold text-ink-soft">/ 100</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-card">
            <h4 className="font-display text-base font-bold text-ink">Why this result?</h4>
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

          <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-card">
            <h4 className="font-display text-base font-bold text-ink">What you should do</h4>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">{result.recommendedAction}</p>

            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
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
              {isEmergency && (
                <Link
                  to="/patient/emergency"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                >
                  <Siren className="w-4 h-4 shrink-0" />
                  Alert my care team
                </Link>
              )}
              <Link
                to="/patient/appointments"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm border border-line-strong text-ink-muted hover:bg-raised transition-colors"
              >
                <Calendar className="w-4 h-4 shrink-0" />
                Book a doctor visit
              </Link>
            </div>
          </div>

          {(result.explanation || result.disclaimer) && (
            <details className="group bg-surface rounded-2xl border border-line shadow-card overflow-hidden">
              <summary className="flex items-center justify-between gap-3 p-5 cursor-pointer list-none hover:bg-raised transition-colors">
                <span className="font-display text-sm font-bold text-ink">
                  More details
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
