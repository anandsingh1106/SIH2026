import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { analyzeTriage, TriageResult } from '../../services/ai/triageEngine';
import { VitalsInputGroup } from '../healthcare/VitalsInputGroup';
import { Vitals } from '../../types';
import { Button } from '../ui/Button';
import { TriageBadge } from '../healthcare/TriageBadge';
import { Sparkles, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export interface ExplainableTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymptoms?: string[];
  initialVitals?: Vitals;
  onApplyAssessment?: (result: TriageResult) => void;
}

export const ExplainableTriageModal: React.FC<ExplainableTriageModalProps> = ({
  isOpen,
  onClose,
  initialSymptoms = [],
  initialVitals = {},
  onApplyAssessment,
}) => {
  const [symptomText, setSymptomText] = useState(initialSymptoms.join(', ') || 'Chest heaviness on exertion, shortness of breath on climbing stairs');
  const [vitals, setVitals] = useState<Vitals>(initialVitals.bpSystolic ? initialVitals : { bpSystolic: 148, bpDiastolic: 94, pulse: 84, spo2: 96, temperature: 98.6 });
  const [isPregnant, setIsPregnant] = useState(false);
  const [age, setAge] = useState(52);
  const [result, setResult] = useState<TriageResult | null>(null);

  const handleRunTriage = () => {
    const symptomsList = symptomText.split(',').map((s) => s.trim()).filter(Boolean);
    const triage = analyzeTriage(symptomsList, vitals, age, isPregnant);
    setResult(triage);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Explainable Clinical AI Triage Analyzer"
      description="Transparent, deterministic clinical decision support grounded in National Health Mission protocols"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-slate-500 italic">
            Mandatory human clinician validation required prior to ordering treatment.
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {result && onApplyAssessment && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  onApplyAssessment(result);
                  onClose();
                }}
              >
                Apply to Consultation Notes
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Input parameters */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reported Symptoms & Chief Complaints (comma-separated):
            </label>
            <textarea
              rows={2}
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-3 focus:outline-none focus:border-gov-600"
              placeholder="e.g. high fever, severe headache, chest pain, breathless..."
            />
          </div>

          <VitalsInputGroup vitals={vitals} onChange={setVitals} />

          <div className="flex items-center gap-4 text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isPregnant}
                onChange={(e) => setIsPregnant(e.target.checked)}
                className="rounded text-gov-600 focus:ring-gov-500"
              />
              <span>Patient is Pregnant (Maternal Triage Rules)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Age:</span>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || 30)}
                className="w-16 text-xs border border-slate-300 rounded px-2 py-1"
              />
            </div>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={handleRunTriage}
            >
              Analyze Triage Score
            </Button>
          </div>
        </div>

        {/* Explainable AI Results Breakdown */}
        {result && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <TriageBadge priority={result.riskLevel} size="lg" />
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Calculated Triage Severity: {result.score} / 100
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Confidence Level: {result.confidence}% (Standard Protocol Match)
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-gov-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                Primary Assessment: {result.primaryConcern}
              </div>
            </div>

            {/* Contributing Factor Explanations */}
            <div>
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-gov-700" />
                Explainable Contributing Factors & Weightage:
              </h5>
              <div className="space-y-1.5">
                {result.contributingFactors.map((factor, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gov-600 shrink-0 mt-1.5" />
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Clinical Action */}
            <div className="p-3.5 bg-gov-50 border border-gov-200 rounded-xl text-xs text-gov-900">
              <div className="font-bold mb-1">Recommended Next Step:</div>
              <div>{result.recommendedAction}</div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
