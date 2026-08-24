import React, { useState } from 'react';
import { MapPin, Search, Building2, Users, Bed, Pill, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { MAHARASHTRA_DISTRICT_STATS } from '../../data/mockData';

export const AdminDistrictAnalytics: React.FC = () => {
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('Pune');
  const [search, setSearch] = useState('');

  const districts = MAHARASHTRA_DISTRICT_STATS;
  const current = districts.find(d => d.district.toLowerCase() === selectedDistrictName.toLowerCase()) || districts[0];

  const filteredDistricts = districts.filter(d => 
    d.district.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'District Analytics Matrix' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">District Healthcare Analytics & Facility Matrix</h1>
            <p className="text-sm text-slate-500">Drill down across all 36 Maharashtra districts for facility infrastructure and operational KPIs</p>
          </div>
        </div>
      </div>

      {/* District Selector Grid */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Maharashtra District</span>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 36 districts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs"
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
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
            <h2 className="text-xl font-black text-slate-900">{current.district} District Healthcare Infrastructure</h2>
            <p className="text-xs text-slate-500">Live operational readiness, bed density, and public health supply chain</p>
          </div>
          <Badge variant="success" className="text-xs">Active Administrative Unit</Badge>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Key District Public Health Highlights</h3>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                <span>eSanjeevani Tele-consultations completed this month: <strong>1,420 sessions</strong></span>
              </li>
              <li className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>ASHA offline sync compliance rate: <strong>99.1%</strong></span>
              </li>
              <li className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <span>Specialist referral resolution turnaround time: <strong>4.2 hours average</strong></span>
              </li>
            </ul>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">District Referral Flow</h3>
            <p className="text-xs text-slate-500">Primary tertiary referral paths from rural PHCs in {current.district}:</p>
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
