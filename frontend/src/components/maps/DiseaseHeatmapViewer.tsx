import React, { useMemo, useState } from 'react';
import { Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { MaharashtraChoropleth, type ChoroplethDatum } from './MaharashtraChoropleth';

type DiseaseId = 'dengue' | 'hypertension' | 'maternal_risk' | 'malnutrition';

interface Cluster {
  district: string;
  region: string;
  cases: number;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  trend: string;
  factor: string;
}

const DISEASES: { id: DiseaseId; label: string; accent: string }[] = [
  { id: 'dengue', label: '🦟 Dengue & Malaria', accent: 'bg-red-600' },
  { id: 'maternal_risk', label: '🤰 Maternal High-Risk (HRP)', accent: 'bg-gov-700' },
  { id: 'hypertension', label: '🩺 Hypertension / NCD', accent: 'bg-purple-700' },
];

/**
 * Surveillance clusters per disease. Only districts with reported activity
 * appear -- the map renders the rest as "no data" rather than as a zero,
 * because an unreported district is not the same as a district with no cases.
 */
const CLUSTERS: Record<DiseaseId, Cluster[]> = {
  dengue: [
    { district: 'Gadchiroli', region: 'Vidarbha', cases: 480, severity: 'critical', trend: '+38% this week', factor: 'Monsoon standing water & tribal hamlets' },
    { district: 'Palghar', region: 'Konkan', cases: 340, severity: 'high', trend: '+29% this week', factor: 'Coastal vector density' },
    { district: 'Nandurbar', region: 'Khandesh', cases: 290, severity: 'high', trend: '+14% this week', factor: 'Tribal migration tracking' },
    { district: 'Chandrapur', region: 'Vidarbha', cases: 245, severity: 'high', trend: '+21% this week', factor: 'Forest-fringe breeding sites' },
    { district: 'Pune', region: 'Western Maharashtra', cases: 210, severity: 'moderate', trend: '-5% this week', factor: 'Urban fringe surveillance' },
    { district: 'Chhatrapati Sambhajinagar', region: 'Marathwada', cases: 180, severity: 'moderate', trend: '+8% this week', factor: 'Drought-prone storage tanks' },
    { district: 'Thane', region: 'Konkan', cases: 165, severity: 'moderate', trend: '+3% this week', factor: 'Construction site water pooling' },
    { district: 'Nagpur', region: 'Vidarbha', cases: 120, severity: 'low', trend: '-9% this week', factor: 'Fogging rounds completed' },
    { district: 'Kolhapur', region: 'Western Maharashtra', cases: 85, severity: 'low', trend: '-12% this week', factor: 'Active fogging completed' },
  ],
  maternal_risk: [
    { district: 'Nandurbar', region: 'Khandesh', cases: 312, severity: 'critical', trend: '+11% this month', factor: 'Severe anaemia in tribal blocks' },
    { district: 'Gadchiroli', region: 'Vidarbha', cases: 268, severity: 'critical', trend: '+7% this month', factor: 'Distance to CEmONC facility' },
    { district: 'Yavatmal', region: 'Vidarbha', cases: 194, severity: 'high', trend: '+4% this month', factor: 'Low institutional delivery uptake' },
    { district: 'Beed', region: 'Marathwada', cases: 176, severity: 'high', trend: '+9% this month', factor: 'Migrant cane-cutter families' },
    { district: 'Dharashiv', region: 'Marathwada', cases: 142, severity: 'moderate', trend: '-2% this month', factor: 'ANC 4-visit compliance gap' },
    { district: 'Nashik', region: 'North Maharashtra', cases: 118, severity: 'moderate', trend: '-6% this month', factor: 'HRP tracking improving' },
    { district: 'Pune', region: 'Western Maharashtra', cases: 74, severity: 'low', trend: '-14% this month', factor: 'Strong referral linkage' },
  ],
  hypertension: [
    { district: 'Mumbai Suburban', region: 'Konkan', cases: 1420, severity: 'critical', trend: '+6% this quarter', factor: 'Sedentary urban lifestyle' },
    { district: 'Mumbai City', region: 'Konkan', cases: 1180, severity: 'critical', trend: '+5% this quarter', factor: 'High salt intake, air quality' },
    { district: 'Pune', region: 'Western Maharashtra', cases: 960, severity: 'high', trend: '+8% this quarter', factor: 'CBAC screening scale-up' },
    { district: 'Nagpur', region: 'Vidarbha', cases: 720, severity: 'high', trend: '+4% this quarter', factor: 'NCD clinic enrolment rising' },
    { district: 'Thane', region: 'Konkan', cases: 655, severity: 'moderate', trend: '+2% this quarter', factor: 'Peri-urban screening drive' },
    { district: 'Nashik', region: 'North Maharashtra', cases: 480, severity: 'moderate', trend: '-1% this quarter', factor: 'Treatment adherence improving' },
    { district: 'Solapur', region: 'Western Maharashtra', cases: 340, severity: 'low', trend: '-4% this quarter', factor: 'Stable follow-up cohort' },
  ],
  malnutrition: [],
};

export const DiseaseHeatmapViewer: React.FC = () => {
  const [selectedDisease, setSelectedDisease] = useState<DiseaseId>('dengue');
  const [focused, setFocused] = useState<string | undefined>();

  const clusters = CLUSTERS[selectedDisease].filter((c) => c.cases > 0);

  const mapData = useMemo(() => {
    const out: Record<string, ChoroplethDatum> = {};
    for (const c of clusters) {
      out[c.district] = {
        value: c.cases,
        detail: [
          { label: 'Risk level', value: c.severity.toUpperCase() },
          { label: '7-day trend', value: c.trend },
          { label: 'Division', value: c.region },
        ],
      };
    }
    return out;
  }, [clusters]);

  const getSeverityBadge = (s: string) => {
    if (s === 'critical') return <Badge variant="critical">CRITICAL HOTSPOT</Badge>;
    if (s === 'high') return <Badge variant="danger">HIGH INCIDENCE</Badge>;
    if (s === 'moderate') return <Badge variant="warning">MODERATE</Badge>;
    return <Badge variant="success">CONTROLLED</Badge>;
  };

  const totalCases = clusters.reduce((sum, c) => sum + c.cases, 0);

  return (
    <div className="bg-surface rounded-2xl border border-line p-5 shadow-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-ink text-base flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-600" />
            Epidemiological Surveillance & Disease Hotspot Heatmap
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Real-time clustering powered by grassroots ASHA CBAC surveys and OPD syndromic notifications
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-sand-100 p-1 rounded-xl text-xs">
          {DISEASES.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setSelectedDisease(d.id);
                setFocused(undefined);
              }}
              aria-pressed={selectedDisease === d.id}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                selectedDisease === d.id
                  ? `${d.accent} text-white shadow-card`
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-raised border border-line px-4 py-2.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
            Districts reporting
          </p>
          <p className="text-lg font-display font-extrabold text-ink tabular-nums leading-tight">
            {clusters.length}
          </p>
        </div>
        <div className="w-px h-8 bg-line" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
            Total active cases
          </p>
          <p className="text-lg font-display font-extrabold text-ink tabular-nums leading-tight">
            {totalCases.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="w-px h-8 bg-line" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
            Critical hotspots
          </p>
          <p className="text-lg font-display font-extrabold text-red-700 tabular-nums leading-tight">
            {clusters.filter((c) => c.severity === 'critical').length}
          </p>
        </div>
      </div>

      {/* The map. Severity ramp runs cool -> saffron -> red. */}
      <div className="rounded-2xl border border-line bg-raised p-4">
        <MaharashtraChoropleth
          data={mapData}
          metricLabel="reported cases (14 days)"
          ramp="severity"
          selected={focused}
          onSelect={(d) => setFocused((prev) => (prev === d ? undefined : d))}
        />
      </div>

      {/* Cluster table. Clicking a row focuses that district on the map above. */}
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-xs text-left">
          <thead className="bg-raised text-ink-muted font-semibold border-b border-line">
            <tr>
              <th className="p-3">District Node</th>
              <th className="p-3">Administrative Division</th>
              <th className="p-3">Reported Cases (Last 14 Days)</th>
              <th className="p-3">7-Day Trajectory</th>
              <th className="p-3">Risk Level</th>
              <th className="p-3">Primary Epidemiological Driver</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-ink">
            {clusters.map((c) => {
              const isRising = c.trend.trim().startsWith('+');
              return (
                <tr
                  key={c.district}
                  onClick={() => setFocused((prev) => (prev === c.district ? undefined : c.district))}
                  onMouseEnter={() => setFocused(c.district)}
                  className={`cursor-pointer transition-colors ${
                    focused === c.district ? 'bg-saffron-50' : 'hover:bg-raised'
                  }`}
                >
                  <td className="p-3 font-bold text-ink">{c.district}</td>
                  <td className="p-3 text-ink-muted">{c.region}</td>
                  <td className="p-3 font-bold text-ink tabular-nums">
                    {c.cases.toLocaleString('en-IN')} active cases
                  </td>
                  <td
                    className={`p-3 font-semibold ${
                      isRising ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {isRising ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {c.trend}
                    </span>
                  </td>
                  <td className="p-3">{getSeverityBadge(c.severity)}</td>
                  <td className="p-3 text-ink-soft italic">{c.factor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
