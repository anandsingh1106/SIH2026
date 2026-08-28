import React, { useMemo, useState } from 'react';
import { MapPin, Search, Building2, Users, Bed, Pill, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { MAHARASHTRA_DISTRICT_STATS } from '../../data/mockData';
import { MaharashtraChoropleth, type ChoroplethDatum, type RampName } from '../../components/maps/MaharashtraChoropleth';

/** Metrics the district map can be shaded by. */
const MAP_METRICS = [
  { id: 'ashaCount', label: 'ASHA workers', ramp: 'teal' as RampName },
  { id: 'phcCount', label: 'Primary health centres', ramp: 'teal' as RampName },
  { id: 'subCenterCount', label: 'Sub-centres', ramp: 'teal' as RampName },
  { id: 'bedOccupancyRate', label: 'Bed occupancy %', ramp: 'severity' as RampName },
  { id: 'medicineAvailabilityRate', label: 'Medicine availability %', ramp: 'saffron' as RampName },
] as const;

type MapMetric = (typeof MAP_METRICS)[number]['id'];

export const AdminDistrictAnalytics: React.FC = () => {
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('Pune');
  const [search, setSearch] = useState('');

  const districts = MAHARASHTRA_DISTRICT_STATS;
  const current = districts.find(d => d.district.toLowerCase() === selectedDistrictName.toLowerCase()) || districts[0];

  const filteredDistricts = districts.filter(d => 
    d.district.toLowerCase().includes(search.toLowerCase())
  );

  const [mapMetric, setMapMetric] = useState<MapMetric>('ashaCount');
  const activeMapMetric = MAP_METRICS.find(m => m.id === mapMetric)!;

  const mapData = useMemo(() => {
    const out: Record<string, ChoroplethDatum> = {};
    for (const d of districts) {
      out[d.district] = {
        value: d[mapMetric],
        detail: [
          { label: 'PHCs', value: String(d.phcCount) },
          { label: 'CHCs', value: String(d.chcCount) },
          { label: 'Sub-centres', value: String(d.subCenterCount) },
          { label: 'Bed occupancy', value: `${d.bedOccupancyRate}%` },
          { label: 'Medicine stock', value: `${d.medicineAvailabilityRate}%` },
        ],
      };
    }
    return out;
  }, [districts, mapMetric]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'District Analytics Matrix' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">District Healthcare Analytics & Facility Matrix</h1>
            <p className="text-sm text-ink-soft">Drill down across all 36 Maharashtra districts for facility infrastructure and operational KPIs</p>
          </div>
        </div>
      </div>

      {/* Geographic overview — click a district to drill into it below */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">
              Statewide Geographic Distribution
            </span>
            {/* Only the districts present in the dataset are shaded. Unshaded
                means "not yet reported", which is not the same as zero, so it
                is stated rather than filled in with a misleading value. */}
            <p className="text-[11px] text-ink-soft mt-0.5">
              {Object.keys(mapData).length} of 36 districts reporting — unshaded districts have no data submitted
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
          onSelect={setSelectedDistrictName}
        />
      </Card>

      {/* District Selector Grid */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-bold text-sand-700 uppercase tracking-wider">Select Maharashtra District</span>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 36 districts..."
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
                selectedDistrictName.toLowerCase() === d.district.toLowerCase()
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-sand-100 text-sand-700 hover:bg-sand-200'
              }`}
            >
              {d.district}
            </button>
          ))}
        </div>
      </Card>

      {/* Selected District Deep Dive */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-ink">{current.district} District Healthcare Infrastructure</h2>
            <p className="text-xs text-ink-soft">Live operational readiness, bed density, and public health supply chain</p>
          </div>
          <Badge variant="success" className="text-xs">Active Administrative Unit</Badge>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          <Card className="p-4 bg-blue-50/70 border-blue-200">
            <span className="text-xs font-bold text-blue-800 uppercase">Healthcare Facilities</span>
            <div className="mt-2 text-2xl font-bold text-blue-950">
              {current.phcCount + current.chcCount + current.subCenterCount}
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {current.phcCount} PHCs • {current.chcCount} CHCs • {current.subCenterCount} Subcenters
            </p>
          </Card>

          <Card className="p-4 bg-teal-50/70 border-teal-200">
            <span className="text-xs font-bold text-teal-800 uppercase">ASHA Workforce</span>
            <div className="mt-2 text-2xl font-bold text-teal-950">
              {current.ashaCount.toLocaleString()}
            </div>
            <p className="text-xs text-teal-700 mt-1">100% village and ward coverage</p>
          </Card>

          <Card className="p-4 bg-purple-50/70 border-purple-200">
            <span className="text-xs font-bold text-purple-800 uppercase">Inpatient Bed Occupancy</span>
            <div className="mt-2 text-2xl font-bold text-purple-950">
              {current.bedOccupancyRate}%
            </div>
            <p className="text-xs text-purple-700 mt-1">Across DH, SDH and CHC beds</p>
          </Card>

          <Card className="p-4 bg-emerald-50/70 border-emerald-200">
            <span className="text-xs font-bold text-emerald-800 uppercase">e-Aushadhi Drug Supply</span>
            <div className="mt-2 text-2xl font-bold text-emerald-950">
              {current.medicineAvailabilityRate}%
            </div>
            <p className="text-xs text-emerald-700 mt-1">Essential drug stock in green</p>
          </Card>
        </div>

        {/* Operational Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-ink text-sm">Key District Public Health Highlights</h3>
            <ul className="space-y-2 text-xs text-sand-700">
              <li className="p-2.5 bg-sand-50 rounded-lg border border-line flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                <span>eSanjeevani Tele-consultations completed this month: <strong>1,420 sessions</strong></span>
              </li>
              <li className="p-2.5 bg-sand-50 rounded-lg border border-line flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>ASHA offline sync compliance rate: <strong>99.1%</strong></span>
              </li>
              <li className="p-2.5 bg-sand-50 rounded-lg border border-line flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <span>Specialist referral resolution turnaround time: <strong>4.2 hours average</strong></span>
              </li>
            </ul>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-ink text-sm">District Referral Flow</h3>
            <p className="text-xs text-ink-soft">Primary tertiary referral paths from rural PHCs in {current.district}:</p>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs space-y-2 text-purple-900">
              <div className="flex justify-between font-bold">
                <span>District Hospital {current.district}</span>
                <span>64% of outbound cases</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Sassoon General Hospital / Tertiary Med College</span>
                <span>28% of critical cases</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Super-specialty Cardiac / Oncology Center</span>
                <span>8% of complex cases</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
