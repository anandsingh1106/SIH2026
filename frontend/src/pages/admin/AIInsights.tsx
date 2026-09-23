import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Lightbulb, ArrowRight, CheckCircle2, RefreshCw, MapPin } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { backendApi, type HealthSignal, type VillageHotspot } from '@arogyasetu/shared/services/api';

const SEVERITY_BADGE: Record<HealthSignal['severity'], 'danger' | 'warning' | 'info'> = {
  critical: 'danger',
  high: 'warning',
  moderate: 'info',
};

export const AdminAIInsights: React.FC = () => {
  const [signals, setSignals] = useState<HealthSignal[]>([]);
  const [hotspots, setHotspots] = useState<VillageHotspot[]>([]);
  const [generatedAt, setGeneratedAt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // Hidden for this visit only; the signal returns while its cause remains.
  const [dismissed, setDismissed] = useState<string[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await backendApi.getHealthSignals();
      setSignals(data.signals);
      setHotspots(data.hotspots);
      setGeneratedAt(data.generatedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not compute health signals.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = signals.filter((s) => !dismissed.includes(s.id));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'Health Signals & Early Warnings' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Health Signals & Early Warnings</h1>
            <p className="text-sm text-ink-soft">
              Referral delays, maternal risk, stock-outs, bed pressure and missed follow-ups, found in current records
            </p>
          </div>
        </div>

        <button
          onClick={() => void load()}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 border border-line text-xs font-bold rounded-lg hover:bg-sand-50 disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Recheck now
        </button>
      </div>

      <p className="text-[11px] text-ink-soft">
        Each signal comes from a fixed rule applied to live platform data, and lists the figures it was raised from.
        {generatedAt && ` Checked ${new Date(generatedAt).toLocaleString('en-IN')}.`}
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
      )}

      {hotspots.length > 0 && (
        <Card className="p-5 space-y-3">
          <h2 className="font-bold text-ink text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-600" /> Villages carrying the most open risk
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {hotspots.map((h) => (
              <div key={`${h.district}-${h.village}`} className="p-3 bg-sand-50 rounded-xl border border-line text-xs space-y-1">
                <p className="font-bold text-ink">{h.village}</p>
                <p className="text-[11px] text-ink-soft">{[h.taluka, h.district].filter(Boolean).join(', ')}</p>
                <ul className="text-[11px] text-sand-700 pt-1 space-y-0.5">
                  {h.highRiskMaternal > 0 && <li>{h.highRiskMaternal} high-risk pregnancy</li>}
                  {h.severeAnaemia > 0 && <li>{h.severeAnaemia} severe anaemia</li>}
                  {h.ncdHighRisk > 0 && <li>{h.ncdHighRisk} high-risk NCD screen</li>}
                  {h.overdueVaccines > 0 && <li>{h.overdueVaccines} overdue vaccine dose</li>}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading && <Card className="p-8 text-center text-xs text-ink-soft">Checking records…</Card>}

        {!isLoading && active.map(signal => (
          <Card key={signal.id} className="p-5 md:p-6 border-amber-200 bg-gradient-to-br from-surface to-amber-50/20 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="warning" className="text-[10px] uppercase">{signal.category}</Badge>
                <Badge variant={SEVERITY_BADGE[signal.severity]} className="uppercase text-[10px]">
                  {signal.severity}
                </Badge>
              </div>
              <h2 className="text-lg font-bold text-ink mt-1">{signal.title}</h2>
              <p className="text-xs font-semibold text-ink-muted">
                Where: <strong>{signal.location}</strong>
              </p>
            </div>

            <div className="p-3.5 bg-sand-50 rounded-xl border border-line text-xs text-sand-700 space-y-1">
              <span className="font-bold text-ink">What the records show:</span>
              <p className="leading-relaxed">{signal.evidence}</p>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="font-bold text-amber-900">Suggested action:</span>
                <p className="mt-0.5 leading-relaxed">{signal.recommendedAction}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-line">
              <button
                onClick={() => setDismissed(prev => [...prev, signal.id])}
                className="text-xs text-ink-soft hover:text-sand-700 font-semibold"
              >
                Hide for now
              </button>
              <Link
                to={signal.link}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-sand-950 text-xs font-bold rounded-lg hover:bg-amber-500 transition-colors shadow-sm"
              >
                Open related page <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        ))}

        {!isLoading && !error && active.length === 0 && (
          <div className="text-center py-16 text-ink-soft">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <p className="font-semibold text-sand-700">
              {signals.length === 0 ? 'Nothing needs attention right now' : 'All signals hidden for this visit'}
            </p>
            <p className="text-xs text-ink-soft mt-1">Signals reappear here while their cause is still in the records.</p>
          </div>
        )}
      </div>
    </div>
  );
};
