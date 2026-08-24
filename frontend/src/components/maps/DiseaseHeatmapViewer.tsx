import React, { useState } from 'react';
import { Flame, AlertTriangle, ShieldCheck, Filter } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const DiseaseHeatmapViewer: React.FC = () => {
  const [selectedDisease, setSelectedDisease] = useState<'dengue' | 'hypertension' | 'maternal_risk' | 'malnutrition'>('dengue');

  const clusters = [
    { district: 'Gadchiroli', region: 'Vidarbha', cases: 480, severity: 'critical', trend: '+38% this week', factor: 'Monsoon standing water & tribal hamlets' },
    { district: 'Palghar', region: 'Konkan', cases: 340, severity: 'high', trend: '+29% this week', factor: 'Coastal vector density' },
    { district: 'Nandurbar', region: 'Khandesh', cases: 290, severity: 'high', trend: '+14% this week', factor: 'Tribal migration tracking' },
    { district: 'Pune', region: 'Western Maharashtra', cases: 210, severity: 'moderate', trend: '-5% this week', factor: 'Urban fringe surveillance' },
    { district: 'Chhatrapati Sambhajinagar', region: 'Marathwada', cases: 180, severity: 'moderate', trend: '+8% this week', factor: 'Drought-prone storage tanks' },
    { district: 'Kolhapur', region: 'Western Maharashtra', cases: 85, severity: 'low', trend: '-12% this week', factor: 'Active fogging completed' },
  ];

  const getSeverityBadge = (s: string) => {
    if (s === 'critical') return <Badge variant="critical">CRITICAL HOTSPOT</Badge>;
    if (s === 'high') return <Badge variant="danger">HIGH INCIDENCE</Badge>;
    if (s === 'moderate') return <Badge variant="warning">MODERATE</Badge>;
    return <Badge variant="success">CONTROLLED</Badge>;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-600 animate-pulse" />
            Epidemiological Surveillance & Disease Hotspot Heatmap
          </h3>
          <p className="text-xs text-slate-500">
            Real-time clustering powered by grassroots ASHA CBAC surveys and OPD syndromic notifications
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setSelectedDisease('dengue')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              selectedDisease === 'dengue' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🦟 Dengue & Malaria
          </button>
          <button
            onClick={() => setSelectedDisease('maternal_risk')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              selectedDisease === 'maternal_risk' ? 'bg-gov-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🤰 Maternal High-Risk (HRP)
          </button>
          <button
            onClick={() => setSelectedDisease('hypertension')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              selectedDisease === 'hypertension' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🩺 Hypertension / NCD
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-3">District Node</th>
              <th className="p-3">Administrative Division</th>
              <th className="p-3">Reported Cases (Last 14 Days)</th>
              <th className="p-3">7-Day Trajectory</th>
              <th className="p-3">Risk Level</th>
              <th className="p-3">Primary Epidemiological Driver</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {clusters.map((c, i) => (
              <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-3 font-bold text-slate-900">{c.district}</td>
                <td className="p-3 text-slate-600">{c.region}</td>
                <td className="p-3 font-mono font-bold text-slate-800">{c.cases} active cases</td>
                <td className="p-3 font-semibold text-red-600">{c.trend}</td>
                <td className="p-3">{getSeverityBadge(c.severity)}</td>
                <td className="p-3 text-slate-500 italic">{c.factor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
