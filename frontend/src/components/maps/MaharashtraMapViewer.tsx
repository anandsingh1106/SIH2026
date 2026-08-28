import React, { useMemo, useState } from 'react';
import { MAHARASHTRA_DISTRICTS } from '../../data/mockData';
import { Building2, Users, BedDouble, AlertCircle, Map as MapIcon, List } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { MaharashtraChoropleth, type ChoroplethDatum, type RampName } from './MaharashtraChoropleth';

export interface DistrictMetric {
  name: string;
  facilities: number;
  doctors: number;
  ashaCount: number;
  icuAvailable: number;
  activeReferrals: number;
  status: 'normal' | 'moderate' | 'alert';
}

/** The metrics the map can be shaded by. */
const METRICS = [
  { id: 'facilities', label: 'Empaneled facilities', ramp: 'teal' as RampName, icon: Building2 },
  { id: 'doctors', label: 'Doctors & specialists', ramp: 'teal' as RampName, icon: Users },
  { id: 'ashaCount', label: 'ASHA workers', ramp: 'teal' as RampName, icon: Users },
  { id: 'icuAvailable', label: 'ICU beds free', ramp: 'saffron' as RampName, icon: BedDouble },
  { id: 'activeReferrals', label: 'Active referrals', ramp: 'severity' as RampName, icon: AlertCircle },
] as const;

type MetricId = (typeof METRICS)[number]['id'];

export const MaharashtraMapViewer: React.FC<{
  selectedDistrict?: string;
  onSelectDistrict?: (district: string) => void;
}> = ({ selectedDistrict = 'Pune', onSelectDistrict }) => {
  const [metric, setMetric] = useState<MetricId>('facilities');
  const [view, setView] = useState<'map' | 'list'>('map');
  const [internalSelection, setInternalSelection] = useState(selectedDistrict);

  // The parent may or may not control the selection; track it either way so
  // the detail panel still responds when no handler is supplied.
  const activeName = onSelectDistrict ? selectedDistrict : internalSelection;

  const handleSelect = (d: string) => {
    setInternalSelection(d);
    onSelectDistrict?.(d);
  };

  // Generate believable district metrics
  const getDistrictData = (dist: string): DistrictMetric => {
    if (dist === 'Pune') return { name: 'Pune', facilities: 342, doctors: 1850, ashaCount: 4200, icuAvailable: 48, activeReferrals: 114, status: 'normal' };
    if (dist === 'Mumbai City' || dist === 'Mumbai Suburban') return { name: dist, facilities: 410, doctors: 3200, ashaCount: 2800, icuAvailable: 76, activeReferrals: 240, status: 'normal' };
    if (dist === 'Gadchiroli') return { name: 'Gadchiroli', facilities: 86, doctors: 180, ashaCount: 1450, icuAvailable: 5, activeReferrals: 42, status: 'alert' };
    if (dist === 'Nagpur') return { name: 'Nagpur', facilities: 260, doctors: 1400, ashaCount: 3100, icuAvailable: 34, activeReferrals: 98, status: 'normal' };
    if (dist === 'Nashik') return { name: 'Nashik', facilities: 290, doctors: 1250, ashaCount: 3600, icuAvailable: 26, activeReferrals: 82, status: 'normal' };
    if (dist === 'Chhatrapati Sambhajinagar') return { name: dist, facilities: 215, doctors: 980, ashaCount: 2900, icuAvailable: 19, activeReferrals: 74, status: 'moderate' };
    if (dist === 'Palghar') return { name: 'Palghar', facilities: 104, doctors: 240, ashaCount: 1680, icuAvailable: 7, activeReferrals: 56, status: 'alert' };
    return { name: dist, facilities: 120, doctors: 450, ashaCount: 1800, icuAvailable: 12, activeReferrals: 38, status: 'normal' };
  };

  const activeData = getDistrictData(activeName);
  const activeMetric = METRICS.find((m) => m.id === metric)!;

  // Build the choropleth payload once per metric change.
  const mapData = useMemo(() => {
    const out: Record<string, ChoroplethDatum> = {};
    for (const name of MAHARASHTRA_DISTRICTS) {
      const d = getDistrictData(name);
      out[name] = {
        value: d[metric],
        detail: [
          { label: 'Facilities', value: d.facilities.toLocaleString('en-IN') },
          { label: 'Doctors', value: d.doctors.toLocaleString('en-IN') },
          { label: 'ICU free', value: String(d.icuAvailable) },
          { label: 'Referrals', value: String(d.activeReferrals) },
        ],
      };
    }
    return out;
  }, [metric]);

  return (
    <div className="bg-surface rounded-2xl border border-line p-5 shadow-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-ink text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gov-700" />
            Maharashtra State Digital Healthcare Grid (36 Districts)
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Interactive geographical command layer with real-time tertiary bed and referral tracking
          </p>
        </div>

        {/* Map / list toggle — the list stays available because a table is
            faster to scan when you already know the district you want. */}
        <div className="flex items-center gap-1 bg-sand-100 p-1 rounded-xl text-xs shrink-0">
          <button
            onClick={() => setView('map')}
            aria-pressed={view === 'map'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              view === 'map' ? 'bg-surface text-gov-800 shadow-card' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" /> Map
          </button>
          <button
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              view === 'list' ? 'bg-surface text-gov-800 shadow-card' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>
      </div>

      {/* Metric selector */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft mr-1">
          Shade by
        </span>
        {METRICS.map((m) => {
          const Icon = m.icon;
          const isActive = metric === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              aria-pressed={isActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                isActive
                  ? 'bg-gov-700 text-white border-gov-800 shadow-soft'
                  : 'bg-surface text-ink-muted border-line hover:border-line-strong hover:text-ink'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Map or list */}
        <div className="lg:col-span-2 bg-raised border border-line rounded-2xl p-4">
          {view === 'map' ? (
            <MaharashtraChoropleth
              data={mapData}
              metricLabel={activeMetric.label}
              ramp={activeMetric.ramp}
              selected={activeName}
              onSelect={handleSelect}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[420px] overflow-y-auto pr-1">
              {MAHARASHTRA_DISTRICTS.map((d) => {
                const isSelected = activeName === d;
                const row = getDistrictData(d);
                const isAlert = row.status === 'alert';

                return (
                  <button
                    key={d}
                    onClick={() => handleSelect(d)}
                    className={`p-2.5 rounded-xl text-left text-xs font-medium border transition-all duration-200 ${
                      isSelected
                        ? 'bg-gov-700 text-white border-gov-800 shadow-soft font-bold'
                        : isAlert
                        ? 'bg-saffron-50 text-saffron-900 border-saffron-200 hover:bg-saffron-100'
                        : 'bg-surface text-ink-muted border-line hover:bg-sand-100 hover:border-line-strong'
                    }`}
                  >
                    <div className="truncate font-semibold">{d}</div>
                    <div
                      className={`text-[10px] tabular-nums truncate ${
                        isSelected ? 'text-gov-100' : 'text-ink-soft'
                      }`}
                    >
                      {row[metric].toLocaleString('en-IN')} {activeMetric.label.toLowerCase()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected District KPI Card */}
        <div className="bg-gradient-to-br from-gov-800 via-gov-900 to-sand-950 text-white rounded-2xl p-5 shadow-elevated border border-gov-800 space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-gov-800 pb-3">
            <div className="min-w-0">
              <span className="text-[10px] text-gov-300 uppercase tracking-widest font-bold">
                Inspecting District
              </span>
              <h4 className="text-xl font-display font-bold text-white truncate">
                {activeData.name}
              </h4>
            </div>
            <Badge variant={activeData.status === 'alert' ? 'danger' : 'primary'}>
              {activeData.status === 'alert' ? 'Vector Alert' : 'Normal Grid'}
            </Badge>
          </div>

          <dl className="space-y-2.5 text-xs">
            {[
              { icon: Building2, label: 'Empaneled Facilities', value: activeData.facilities.toLocaleString('en-IN'), tone: 'text-white' },
              { icon: Users, label: 'Active Doctors & Specialists', value: activeData.doctors.toLocaleString('en-IN'), tone: 'text-white' },
              { icon: Users, label: 'ASHA Frontline Workers', value: activeData.ashaCount.toLocaleString('en-IN'), tone: 'text-white' },
              { icon: BedDouble, label: 'Available ICU / Ventilators', value: `${activeData.icuAvailable} Free`, tone: 'text-emerald-400' },
              { icon: AlertCircle, label: 'Active Tele-Referrals', value: `${activeData.activeReferrals} Active`, tone: 'text-saffron-300' },
            ].map((row, i, arr) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className={`flex justify-between items-center gap-2 py-1 ${
                    i < arr.length - 1 ? 'border-b border-gov-800/60' : ''
                  }`}
                >
                  <dt className="text-gov-200 flex items-center gap-1.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-gov-400 shrink-0" />
                    <span className="truncate">{row.label}:</span>
                  </dt>
                  <dd className={`font-bold text-sm tabular-nums shrink-0 ${row.tone}`}>
                    {row.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </div>
  );
};
