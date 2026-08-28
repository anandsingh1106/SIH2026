import React, { useState } from 'react';
import { Sparkles, Brain, TrendingUp, AlertTriangle, Lightbulb, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

interface AIPrediction {
  id: string;
  category: 'Epidemic Forecast' | 'Supply Chain Bottleneck' | 'Maternal Risk Alert' | 'Resource Optimization';
  title: string;
  confidence: number;
  timeframe: string;
  location: string;
  insight: string;
  recommendedAction: string;
  urgency: 'critical' | 'high' | 'moderate';
}

const MOCK_AI_INSIGHTS: AIPrediction[] = [
  {
    id: 'ai-1',
    category: 'Epidemic Forecast',
    title: 'Post-Monsoon Dengue & Chikungunya Spike Probable',
    confidence: 94,
    timeframe: 'Next 14 - 21 Days',
    location: 'Mulshi & Haveli Talukas (Pune District)',
    insight: 'Rainfall accumulation combined with recent 18% uptick in fever cases detected during ASHA home visits indicates high probability of vector proliferation.',
    recommendedAction: 'Dispatch municipal fogging teams and preload PHC Paud with additional NS1 antigen test kits and IV saline bags.',
    urgency: 'high',
  },
  {
    id: 'ai-2',
    category: 'Supply Chain Bottleneck',
    title: 'Predicted Metformin 500mg Stock-out in 18 Rural PHCs',
    confidence: 91,
    timeframe: 'Next 10 Days',
    location: 'Western Maharashtra Rural Belt',
    insight: 'Dispensation rate has increased by 34% following the statewide NCD screening drive, exceeding standard warehouse replenishment cycle.',
    recommendedAction: 'Trigger automated buffer indent of 25,000 strips from Pune District Central Depot to affected PHC dispensaries.',
    urgency: 'high',
  },
  {
    id: 'ai-3',
    category: 'Maternal Risk Alert',
    title: 'High-Risk Anemia Clustering in Adolescent Mothers',
    confidence: 88,
    timeframe: 'Ongoing Cohort Tracking',
    location: 'Nandurbar & Gadchiroli Tribal Blocks',
    insight: 'AI screening detected 42 pregnant women with Hb < 8.0 g/dL in 3 adjacent subcenters who missed their second IFA supplementation.',
    recommendedAction: 'Schedule emergency mobile medical team visit with injectable iron sucrose therapy and nutrition counseling.',
    urgency: 'critical',
  },
  {
    id: 'ai-4',
    category: 'Resource Optimization',
    title: 'ICU Bed Occupancy Forecast & Transfer Optimization',
    confidence: 86,
    timeframe: 'Next 7 Days',
    location: 'Sassoon Hospital & Aundh District Hospital',
    insight: 'Cardiology referral influx projected to peak on Wednesday. Sassoon CCU bed capacity projected to reach 96%.',
    recommendedAction: 'Direct moderate acuity telemetry patients to Aundh HDU step-down ward to keep 4 tertiary CCU beds vacant for emergency transit.',
    urgency: 'moderate',
  },
];

export const AdminAIInsights: React.FC = () => {
  const [insights, setInsights] = useState<AIPrediction[]>(MOCK_AI_INSIGHTS);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const activeInsights = insights.filter(i => !dismissed.includes(i.id));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'AI Predictive Health Intelligence' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">AI Predictive Epidemiological & Resource Intelligence</h1>
            <p className="text-sm text-ink-soft">Machine learning models predicting disease outbreaks, medicine stock-outs, and maternal risks</p>
          </div>
        </div>

        <Badge variant="success" className="px-3 py-1 text-xs">
          <Brain className="w-3.5 h-3.5 inline mr-1" /> Models Live: Maharashtra Health AI v3
        </Badge>
      </div>

      {/* Grid of AI Insight Cards */}
      <div className="space-y-4">
        {activeInsights.map(insight => (
          <Card key={insight.id} className="p-5 md:p-6 border-amber-200 bg-gradient-to-br from-surface to-amber-50/20 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="warning" className="text-[10px] uppercase">{insight.category}</Badge>
                  <Badge variant={insight.urgency === 'critical' ? 'danger' : insight.urgency === 'high' ? 'warning' : 'info'} className="uppercase text-[10px]">
                    {insight.urgency} Urgency
                  </Badge>
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {insight.confidence}% Model Confidence
                  </span>
                </div>

                <h2 className="text-lg font-bold text-ink mt-1">{insight.title}</h2>
                <p className="text-xs font-semibold text-ink-muted">
                  Target Region: <strong>{insight.location}</strong> • Window: <strong>{insight.timeframe}</strong>
                </p>
              </div>
            </div>

            {/* AI analysis explanation */}
            <div className="p-3.5 bg-sand-50 rounded-xl border border-line text-xs text-sand-700 space-y-1">
              <span className="font-bold text-ink">Epidemiological Pattern Detected:</span>
              <p className="leading-relaxed">{insight.insight}</p>
            </div>

            {/* Recommended Preventive Action */}
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1 flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="font-bold text-amber-900">AI Recommended Public Health Directive:</span>
                <p className="mt-0.5 leading-relaxed">{insight.recommendedAction}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-line">
              <button
                onClick={() => setDismissed(prev => [...prev, insight.id])}
                className="text-xs text-ink-soft hover:text-sand-700 font-semibold"
              >
                Dismiss Directive
              </button>
              <button
                onClick={() => {
                  alert(`Dispatched state directive: "${insight.title}" to local health authorities.`);
                  setDismissed(prev => [...prev, insight.id]);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-sand-950 text-xs font-bold rounded-lg hover:bg-amber-500 transition-colors shadow-sm"
              >
                Execute Preventive Directive <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}

        {activeInsights.length === 0 && (
          <div className="text-center py-16 text-ink-soft">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <p className="font-semibold text-sand-700">All AI predictive alerts addressed</p>
            <p className="text-xs text-ink-soft mt-1">Surveillance engine is monitoring telemetry streams across 36 districts.</p>
          </div>
        )}
      </div>
    </div>
  );
};
