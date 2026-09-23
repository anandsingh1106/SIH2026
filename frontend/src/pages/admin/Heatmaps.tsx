import React, { useEffect, useMemo, useState } from 'react';
import { Flame, Layers } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { backendApi, type HeatmapMetric } from '@arogyasetu/shared/services/api';
import { MaharashtraChoropleth, type ChoroplethDatum, type RampName } from '../../components/maps/MaharashtraChoropleth';

const METRICS: { id: HeatmapMetric; label: string; unit: string; ramp: RampName }[] = [
  { id: 'maternal_high_risk', label: 'High-risk pregnancies', unit: 'high-risk pregnancies', ramp: 'severity' },
  { id: 'severe_anaemia', label: 'Severe anaemia in pregnancy', unit: 'pregnancies with Hb below 7', ramp: 'severity' },
  { id: 'ncd_high_risk', label: 'High-risk NCD screens', unit: 'high-risk NCD screens', ramp: 'severity' },
  { id: 'vaccinations_overdue', label: 'Overdue vaccines', unit: 'overdue vaccine doses', ramp: 'saffron' },
  { id: 'referrals', label: 'Referrals', unit: 'referrals', ramp: 'teal' },
  { id: 'patients', label: 'Registered patients', unit: 'registered patients', ramp: 'teal' },
];

type Point = { district: string; taluka?: string; value: number };

export const AdminHeatmaps: React.FC = () => {
  const [metric, setMetric] = useState<HeatmapMetric>('maternal_high_risk');
  const [points, setPoints] = useState<Point[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [focusedDistrict, setFocusedDistrict] = useState<string | undefined>();

  const active = METRICS.find((m) => m.id === metric)!;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    backendApi
      .getHeatmap(metric)
      .then((data) => { if (!cancelled) setPoints(data.points); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the map data.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [metric]);

  // The API reports talukas; the map is shaded per district with the talukas
  // behind each total listed in its tooltip.
  const mapData = useMemo(() => {
    const out: Record<string, ChoroplethDatum> = {};
    for (const p of points) {
      const entry = out[p.district] ?? (out[p.district] = { value: 0, detail: [] });
      entry.value += p.value;
      entry.detail?.push({ label: p.taluka ?? 'Taluka not recorded', value: String(p.value) });
    }
    return out;
  }, [points]);

  const talukas = [...points].sort((a, b) => b.value - a.value);
  const total = points.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'Geographic Risk Heatmaps' }]} />

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Geographic Risk Heatmaps</h1>
            <p className="text-sm text-ink-soft">Where open clinical risk sits, by district and taluka, from platform records</p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {METRICS.map(m => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              aria-pressed={metric === m.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                metric === m.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-surface border border-line text-ink-muted hover:bg-sand-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
      )}

      <Card className="overflow-hidden border-rose-200 shadow-md">
        <div className="bg-sand-900 text-white p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-xs">{active.label} by district</span>
          </div>
          <span className="text-[10px] text-sand-300">
            {isLoading ? 'Loading…' : `${total} in ${Object.keys(mapData).length} districts`}
          </span>
        </div>

        <div className="bg-raised p-4 sm:p-5">
          <MaharashtraChoropleth
            data={mapData}
            metricLabel={active.unit}
            ramp={active.ramp}
            selected={focusedDistrict}
            onSelect={(d) => setFocusedDistrict((prev) => (prev === d ? undefined : d))}
          />
          <p className="text-[11px] text-ink-soft mt-2">
            Unshaded districts have no records on the platform yet, which is not the same as zero cases.
          </p>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-bold text-ink text-sm">Talukas ranked by {active.label.toLowerCase()}</h2>

        {!isLoading && talukas.length === 0 ? (
          <p className="text-xs text-ink-soft">No {active.unit} recorded.</p>
        ) : (
          <div className="space-y-2">
            {talukas.map(t => {
              const share = total > 0 ? Math.round((t.value / total) * 100) : 0;
              return (
                <div
                  key={`${t.district}-${t.taluka}`}
                  onMouseEnter={() => setFocusedDistrict(t.district)}
                  onMouseLeave={() => setFocusedDistrict(undefined)}
                  className={`p-3 rounded-xl border text-xs transition-colors ${
                    focusedDistrict === t.district ? 'bg-saffron-50 border-saffron-200' : 'bg-raised border-line'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-ink">
                      {t.taluka ?? 'Taluka not recorded'} <span className="font-normal text-ink-soft">• {t.district}</span>
                    </span>
                    <span className="font-bold text-rose-700 shrink-0">{t.value} ({share}%)</span>
                  </div>
                  <div className="w-full bg-sand-100 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-ink-soft">Aggregated counts only. No patient-identifiable data is shown.</p>
      </Card>
    </div>
  );
};
