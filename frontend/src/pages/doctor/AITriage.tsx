import React, { useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Sparkles, Activity, ShieldAlert, CheckCircle2, AlertTriangle, Stethoscope } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { VitalsInputGroup } from '../../components/healthcare/VitalsInputGroup';
import { TriageBadge } from '../../components/healthcare/TriageBadge';
import { analyzeTriage, TriageResult } from '../../services/ai/triageEngine';
import { Vitals } from '../../types';

export const DoctorAITriagePage: React.FC = () => {
  const [symptomInput, setSymptomInput] = useState('Severe retrosternal chest pain radiating to left jaw, diaphoresis, dyspnea');
  const [vitals, setVitals] = useState<Vitals>({ bpSystolic: 158, bpDiastolic: 98, pulse: 104, spo2: 93, temperature: 98.4 });
  const [age, setAge] = useState(62);
  const [isPregnant, setIsPregnant] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = symptomInput.split(',').map((s) => s.trim()).filter(Boolean);
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
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-gov-700" />
          Explainable Clinical Decision Support Triage Engine
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
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
      <form onSubmit={handleAnalyze} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Reported Chief Complaints & Physical Symptoms (comma separated)
          </label>
          <textarea
            rows={2}
            value={symptomInput}
            onChange={(e) => setSymptomInput(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-gov-600 focus:ring-2 focus:ring-gov-100"
          />
        </div>

        <VitalsInputGroup vitals={vitals} onChange={setVitals} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <Input
            label="Patient Age (Years)"
            type="number"
            value={age}
            onChange={(e) => setAge(parseInt(e.target.value) || 0)}
          />
          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
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

      {/* Results Breakdown */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <TriageBadge priority={result.riskLevel} size="lg" />
              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  Calculated Risk Score: {result.score} / 100
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Confidence Rating: {result.confidence}% Match with NHM Guidelines
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Primary Assessment</span>
              <div className="text-sm font-bold text-gov-800">{result.primaryConcern}</div>
            </div>
          </div>

          {/* Explainable Factor Weights */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Explainable Clinical Risk Drivers & Contributing Factors:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.contributingFactors.map((factor, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 flex items-start gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-gov-600 shrink-0 mt-1" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Action */}
          <div className="p-4 bg-gov-50 border border-gov-200 rounded-xl text-xs text-gov-900 space-y-1">
            <div className="font-bold uppercase tracking-wider">Recommended Next Step for Medical Officer:</div>
            <p className="leading-relaxed">{result.recommendedAction}</p>
          </div>

          {/* Narrative explanation, when an AI provider is configured */}
          {result.explanation && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Explanation {result.aiAssisted && <span className="text-gov-600">(AI-assisted)</span>}:
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {result.explanation}
              </p>
            </div>
          )}

          {result.disclaimer && (
            <p className="text-[11px] text-slate-500 italic border-t border-slate-200 pt-3">
              {result.disclaimer}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
