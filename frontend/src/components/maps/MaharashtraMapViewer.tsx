import React, { useState } from 'react';
import { MAHARASHTRA_DISTRICTS } from '../../data/mockData';
import { MapPin, Building2, Users, BedDouble, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface DistrictMetric {
  name: string;
  facilities: number;
  doctors: number;
  ashaCount: number;
  icuAvailable: number;
  activeReferrals: number;
  status: 'normal' | 'moderate' | 'alert';
}

export const MaharashtraMapViewer: React.FC<{
  selectedDistrict?: string;
  onSelectDistrict?: (district: string) => void;
}> = ({ selectedDistrict = 'Pune', onSelectDistrict }) => {
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  // Generate believable district metrics
  const getDistrictData = (dist: string): DistrictMetric => {
    if (dist === 'Pune') return { name: 'Pune', facilities: 342, doctors: 1850, ashaCount: 4200, icuAvailable: 48, activeReferrals: 114, status: 'normal' };
    if (dist === 'Mumbai City' || dist === 'Mumbai Suburban') return { name: dist, facilities: 410, doctors: 3200, ashaCount: 2800, icuAvailable: 76, activeReferrals: 240, status: 'normal' };
    if (dist === 'Gadchiroli') return { name: 'Gadchiroli', facilities: 86, doctors: 180, ashaCount: 1450, icuAvailable: 5, activeReferrals: 42, status: 'alert' };
    if (dist === 'Nagpur') return { name: 'Nagpur', facilities: 260, doctors: 1400, ashaCount: 3100, icuAvailable: 34, activeReferrals: 98, status: 'normal' };
    if (dist === 'Nashik') return { name: 'Nashik', facilities: 290, doctors: 1250, ashaCount: 3600, icuAvailable: 26, activeReferrals: 82, status: 'normal' };
    if (dist === 'Chhatrapati Sambhajinagar') return { name: dist, facilities: 215, doctors: 980, ashaCount: 2900, icuAvailable: 19, activeReferrals: 74, status: 'moderate' };
    return { name: dist, facilities: 120, doctors: 450, ashaCount: 1800, icuAvailable: 12, activeReferrals: 38, status: 'normal' };
  };

  const activeData = getDistrictData(hoveredDistrict || selectedDistrict);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gov-700" />
            Maharashtra State Digital Healthcare Grid (36 Districts)
          </h3>
          <p className="text-xs text-slate-500">
            Interactive geographical command layer with real-time tertiary bed and referral tracking
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Interactive District Grid Visualizer */}
        <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[320px] flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-600 mb-2 flex items-center justify-between">
            <span>Select District Node:</span>
            <span className="text-gov-700 font-semibold">Click district to inspect facility capacity</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[280px] overflow-y-auto pr-1">
            {MAHARASHTRA_DISTRICTS.map((d) => {
              const isSelected = (selectedDistrict || 'Pune') === d;
              const isAlert = d === 'Gadchiroli' || d === 'Palghar';

              return (
                <button
                  key={d}
                  onMouseEnter={() => setHoveredDistrict(d)}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  onClick={() => onSelectDistrict && onSelectDistrict(d)}
                  className={`p-2 rounded-lg text-left text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-gov-700 text-white border-gov-800 shadow-xs font-bold ring-2 ring-gov-300'
                      : isAlert
                      ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="truncate font-semibold">{d}</div>
                  <div className={`text-[10px] ${isSelected ? 'text-gov-100' : 'text-slate-400'} truncate`}>
                    {isAlert ? '⚠️ Vector Alert' : 'Active Grid'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected District KPI Card */}
        <div className="bg-gov-900 text-white rounded-xl p-5 shadow-lg border border-gov-800 space-y-4">
          <div className="flex items-center justify-between border-b border-gov-800 pb-3">
            <div>
              <span className="text-[10px] text-gov-300 uppercase tracking-widest font-bold">
                Inspecting District
              </span>
              <h4 className="text-xl font-bold text-white">{activeData.name}</h4>
            </div>
            <Badge variant={activeData.status === 'alert' ? 'danger' : 'primary'}>
              {activeData.status === 'alert' ? 'Vector Alert' : 'Normal Grid'}
            </Badge>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-gov-800/60">
              <span className="text-gov-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gov-400" />
                Empaneled Facilities:
              </span>
              <span className="font-bold text-white text-sm">{activeData.facilities}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-gov-800/60">
              <span className="text-gov-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gov-400" />
                Active Doctors & Specialists:
              </span>
              <span className="font-bold text-white text-sm">{activeData.doctors}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-gov-800/60">
              <span className="text-gov-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gov-400" />
                ASHA Frontline Workers:
              </span>
              <span className="font-bold text-white text-sm">{activeData.ashaCount}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-gov-800/60">
              <span className="text-gov-200 flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5 text-gov-400" />
                Available ICU / Ventilators:
              </span>
              <span className="font-bold text-emerald-400 text-sm">{activeData.icuAvailable} Free</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-gov-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-gov-400" />
                Active Tele-Referrals:
              </span>
              <span className="font-bold text-amber-300 text-sm">{activeData.activeReferrals} Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
