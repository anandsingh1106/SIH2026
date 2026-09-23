import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { backendApi, type DistrictAnalyticsRecord } from '@arogyasetu/shared/services/api';
import { MaharashtraChoropleth, type ChoroplethDatum, type RampName } from '../../components/maps/MaharashtraChoropleth';

/** Metrics the district map can be shaded by. */
const MAP_METRICS: { id: string; label: string; ramp: RampName; value: (d: DistrictAnalyticsRecord) => number }[] = [
  { id: 'patients', label: 'Registered patients', ramp: 'teal', value: (d) => d.patients },
  { id: 'facilities', label: 'Facilities', ramp: 'teal', value: (d) => d.facilities.total },
  { id: 'occupancy', label: 'Bed occupancy %', ramp: 'severity', value: (d) => d.beds.occupancyRate },
  { id: 'maternal', label: 'High-risk pregnancies', ramp: 'severity', value: (d) => d.highRiskMaternal },
  { id: 'coverage', label: 'Vaccine coverage %', ramp: 'saffron', value: (d) => d.immunization.coverageRate },
];

export const AdminDistrictAnalytics: React.FC = () => {
  const [districts, setDistricts] = useState<DistrictAnalyticsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('');
  const [search, setSearch] = useState('');
  const [mapMetric, setMapMetric] = useState(MAP_METRICS[0].id);

  useEffect(() => {
    backendApi
      .getDistrictAnalytics()
      .then((rows) => {
        setDistricts(rows);
        setSelectedDistrictName((prev) => prev || rows[0]?.district || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load district figures.'))
      .finally(() => setIsLoading(false));
  }, []);

  const current = districts.find(d => d.district === selectedDistrictName) ?? districts[0];
  const filteredDistricts = districts.filter(d => d.district.toLowerCase().includes(search.toLowerCase()));
  const activeMapMetric = MAP_METRICS.find(m => m.id === mapMetric)!;

  const mapData = useMemo(() => {
    const out: Record<string, ChoroplethDatum> = {};
    for (const d of districts) {
      out[d.district] = {
        value: activeMapMetric.value(d),
        detail: [
          { label: 'Patients', value: String(d.patients) },
          { label: 'Facilities', value: String(d.facilities.total) },
          { label: 'Bed occupancy', value: d.beds.total ? `${d.beds.occupancyRate}%` : 'No beds listed' },
          { label: 'High-risk pregnancies', value: String(d.highRiskMaternal) },
          { label: 'Vaccine coverage', value: `${d.immunization.coverageRate}%` },
        ],
      };
    }
    return out;
  }, [districts, activeMapMetric]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'District Analytics Matrix' }]} />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
          <MapPin className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink">District Healthcare Analytics & Facility Matrix</h1>
          <p className="text-sm text-ink-soft">Facilities, workforce, beds and programme activity for every district on the platform</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
      )}

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">Geographic distribution</span>
            {/* Unshaded means "no records yet", which is not the same as zero. */}
            <p className="text-[11px] text-ink-soft mt-0.5">
              {isLoading ? 'Loading…' : `${districts.length} districts with records on the platform. Unshaded districts have none yet.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {MAP_METRICS.map(m => (
              <button
                key={m.id}
                onClick={() => setMapMetric(m.id)}
                aria-pressed={mapMetric === m.id}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                  mapMetric === m.id
                    ? 'bg-purple-600 text-white border-purple-700 shadow-soft'
                    : 'bg-surface text-ink-muted border-line hover:border-line-strong hover:text-ink'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <MaharashtraChoropleth
          data={mapData}
          metricLabel={activeMapMetric.label}
          ramp={activeMapMetric.ramp}
          selected={current?.district}
          onSelect={(name) => { if (mapData[name]) setSelectedDistrictName(name); }}
        />
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-sand-700 uppercase tracking-wider">Select district</span>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search districts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-line rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto p-1">
          {filteredDistricts.map(d => (
            <button
              key={d.district}
              onClick={() => setSelectedDistrictName(d.district)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                current?.district === d.district
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-sand-100 text-sand-700 hover:bg-sand-200'
              }`}
            >
              {d.district} <span className="font-normal opacity-80">({d.patients})</span>
            </button>
          ))}
        </div>
      </Card>

      {current && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-ink">{current.district} District</h2>
              <p className="text-xs text-ink-soft">{current.patients} registered patients on the platform</p>
            </div>
            {current.referrals.emergency > 0 && (
              <Badge variant="danger" className="text-xs">{current.referrals.emergency} emergency referrals</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
            <Card className="p-4 bg-blue-50/70 border-blue-200">
              <span className="text-xs font-bold text-blue-800 uppercase">Healthcare Facilities</span>
              <div className="mt-2 text-2xl font-bold text-blue-950">{current.facilities.total}</div>
              <p className="text-xs text-blue-700 mt-1">
                {current.facilities.subCenters} Sub-centres • {current.facilities.phcs} PHCs • {current.facilities.chcs} CHCs • {current.facilities.hospitals} Hospitals
              </p>
            </Card>

            <Card className="p-4 bg-blue-50/70 border-blue-200">
              <span className="text-xs font-bold text-blue-800 uppercase">Workforce on the platform</span>
              <div className="mt-2 text-2xl font-bold text-blue-950">{current.ashaWorkers + current.doctors}</div>
              <p className="text-xs text-blue-700 mt-1">{current.ashaWorkers} ASHA • {current.doctors} doctors and specialists</p>
            </Card>

            <Card className="p-4 bg-purple-50/70 border-purple-200">
              <span className="text-xs font-bold text-purple-800 uppercase">Inpatient Bed Occupancy</span>
              <div className="mt-2 text-2xl font-bold text-purple-950">
                {current.beds.total ? `${current.beds.occupancyRate}%` : '-'}
              </div>
              <p className="text-xs text-purple-700 mt-1">
                {current.beds.total ? `${current.beds.occupied} of ${current.beds.total} beds occupied` : 'No beds listed in this district'}
              </p>
            </Card>

            <Card className="p-4 bg-emerald-50/70 border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase">Medicine Stock Above Reorder</span>
              <div className="mt-2 text-2xl font-bold text-emerald-950">
                {current.stock.availabilityRate == null ? '-' : `${current.stock.availabilityRate}%`}
              </div>
              <p className="text-xs text-emerald-700 mt-1">
                {current.stock.lines
                  ? `${current.stock.lines} stock lines • ${current.stock.stockedOut} stocked out`
                  : 'No stock recorded in this district'}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
            <Card className="p-5 space-y-3">
              <h3 className="font-bold text-ink text-sm">Programme activity</h3>
              <ul className="space-y-2 text-xs text-sand-700">
                {[
                  ['bg-purple-600', 'Consultations recorded', `${current.consultations} (${current.teleconsultations} by teleconsultation)`],
                  ['bg-emerald-600', 'ASHA home visits', String(current.homeVisits)],
                  ['bg-rose-600', 'High-risk pregnancies being followed', String(current.highRiskMaternal)],
                  ['bg-amber-600', 'Patients with a high-risk NCD screen', String(current.ncdHighRisk)],
                  ['bg-blue-600', 'Vaccine coverage', `${current.immunization.coverageRate}% (${current.immunization.given} given, ${current.immunization.due} due)`],
                ].map(([dot, label, value]) => (
                  <li key={label} className="p-2.5 bg-sand-50 rounded-lg border border-line flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot} mt-1.5 shrink-0`} />
                    <span>{label}: <strong>{value}</strong></span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="font-bold text-ink text-sm">Referral flow</h3>
              <p className="text-xs text-ink-soft">
                {current.referrals.total} referrals for patients from {current.district}: {current.referrals.completed} completed,{' '}
                {current.referrals.pending} in progress.
                {current.referrals.avgAcceptHours != null && ` Accepted in ${current.referrals.avgAcceptHours} hours on average.`}
              </p>
              {current.referrals.topDestinations.length === 0 ? (
                <p className="text-xs text-ink-soft">No referrals yet.</p>
              ) : (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs space-y-2 text-purple-900">
                  {current.referrals.topDestinations.map((d) => (
                    <div key={d.facility} className="flex justify-between gap-3 font-bold">
                      <span>{d.facility}</span>
                      <span className="shrink-0">{d.share}% ({d.count})</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
