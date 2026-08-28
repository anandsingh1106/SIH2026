import React, { useMemo, useState } from 'react';
import { MapPin, AlertTriangle, Flame, ShieldAlert, Filter, Layers, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { OUTBREAK_ALERTS } from '../../data/mockData';
import { MaharashtraChoropleth, type ChoroplethDatum } from '../../components/maps/MaharashtraChoropleth';

export const AdminHeatmaps: React.FC = () => {
  const [selectedDisease, setSelectedDisease] = useState<string>('all');
  const [focusedDistrict, setFocusedDistrict] = useState<string | undefined>();
  const outbreaks = OUTBREAK_ALERTS;

  const filtered = selectedDisease === 'all'
    ? outbreaks
    : outbreaks.filter(o => o.disease.toLowerCase().includes(selectedDisease.toLowerCase()));

  // Several outbreaks can share a district, so cases are summed per district
  // and the clusters behind each total are listed in the tooltip.
  const mapData = useMemo(() => {
    const out: Record<string, ChoroplethDatum> = {};
    for (const o of filtered) {
      const existing = out[o.district];
      if (existing) {
        existing.value += o.casesCount;
        existing.detail?.push({ label: o.disease, value: `${o.casesCount} in ${o.village}` });
      } else {
        out[o.district] = {
          value: o.casesCount,
          detail: [{ label: o.disease, value: `${o.casesCount} in ${o.village}` }],
        };
      }
    }
    return out;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'Epidemic Geographic Surveillance' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Epidemiological GIS Heatmaps & Outbreak Clusters</h1>
            <p className="text-sm text-ink-soft">Real-time spatial clustering for vector-borne and water-borne communicable diseases</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['all', 'dengue', 'cholera', 'chikungunya'].map(dis => (
            <button
              key={dis}
              onClick={() => setSelectedDisease(dis)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                selectedDisease === dis
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-surface border border-line text-ink-muted hover:bg-sand-50'
              }`}
            >
              {dis}
            </button>
          ))}
        </div>
      </div>

      {/* District choropleth — outbreak cases aggregated per district */}
      <Card className="overflow-hidden border-rose-200 shadow-md">
        <div className="bg-sand-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-xs">Maharashtra State GIS Disease Spatial Vector Layer</span>
          </div>
          <span className="text-[10px] text-sand-300 font-mono">IDSP Integrated System v4.2</span>
        </div>

        <div className="bg-raised p-4 sm:p-5">
          <MaharashtraChoropleth
            data={mapData}
            metricLabel="reported outbreak cases"
            ramp="severity"
            selected={focusedDistrict}
            onSelect={(d) => setFocusedDistrict((prev) => (prev === d ? undefined : d))}
          />

          {Object.keys(mapData).length === 0 && (
            <p className="text-center text-sm text-ink-soft italic py-4">
              No active clusters reported for this filter.
            </p>
          )}
        </div>
      </Card>

      {/* Cluster Table */}
      <Card className="p-5 space-y-4">
        <h2 className="font-bold text-ink text-sm">Active Epidemiological Clusters & Interventions</h2>

        <div className="space-y-3">
          {filtered.map(outbreak => (
            <div
              key={outbreak.id}
              onMouseEnter={() => setFocusedDistrict(outbreak.district)}
              onMouseLeave={() => setFocusedDistrict(undefined)}
              className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors cursor-default ${
                focusedDistrict === outbreak.district
                  ? 'bg-saffron-50 border-saffron-200'
                  : 'bg-raised border-line'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-ink text-sm">{outbreak.disease} Hotspot Cluster</span>
                  <Badge variant={outbreak.severity === 'high' ? 'danger' : 'warning'} className="uppercase text-[10px]">
                    {outbreak.severity} Risk
                  </Badge>
                  <span className="text-xs font-semibold text-rose-700">{outbreak.casesCount} Affected Citizens</span>
                </div>
                <p className="text-xs text-ink-muted">
                  Location: <strong>{outbreak.village}</strong>, {outbreak.taluka} Taluka, <strong>{outbreak.district}</strong> District
                </p>
                <p className="text-xs text-ink-soft">First Detected: {outbreak.reportedDate} • Surveillance Protocol: Active Daily Door-to-Door</p>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <button className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors">
                  Dispatch Rapid Response Team
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
