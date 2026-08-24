import React, { useState } from 'react';
import { MapPin, AlertTriangle, Flame, ShieldAlert, Filter, Layers, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { OUTBREAK_ALERTS } from '../../data/mockData';

export const AdminHeatmaps: React.FC = () => {
  const [selectedDisease, setSelectedDisease] = useState<string>('all');
  const outbreaks = OUTBREAK_ALERTS;

  const filtered = selectedDisease === 'all'
    ? outbreaks
    : outbreaks.filter(o => o.disease.toLowerCase() === selectedDisease.toLowerCase());

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'Epidemic Geographic Surveillance' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Epidemiological GIS Heatmaps & Outbreak Clusters</h1>
            <p className="text-sm text-slate-500">Real-time spatial clustering for vector-borne and water-borne communicable diseases</p>
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
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {dis}
            </button>
          ))}
        </div>
      </div>

      {/* Simulated Interactive GIS Map Card */}
      <Card className="overflow-hidden border-rose-200 shadow-md">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-xs">Maharashtra State GIS Disease Spatial Vector Layer</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">IDSP Integrated System v4.2</span>
        </div>

        <div className="h-80 bg-slate-950 relative overflow-hidden flex items-center justify-center p-6 text-center">
          {/* Background grid simulation */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Outbreak Heat Bubbles */}
          <div className="relative z-10 flex flex-wrap gap-8 items-center justify-center">
            {filtered.map(outbreak => (
              <div
                key={outbreak.id}
                className="relative group cursor-pointer animate-pulse"
              >
                <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center text-white p-3 text-center transition-transform transform group-hover:scale-110 ${
                  outbreak.severity === 'high'
                    ? 'bg-rose-600/40 border-2 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.5)]'
                    : 'bg-amber-600/40 border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.5)]'
                }`}>
                  <AlertTriangle className="w-5 h-5 mb-1" />
                  <p className="font-bold text-xs">{outbreak.disease}</p>
                  <p className="text-[10px] font-semibold">{outbreak.casesCount} Cases</p>
                  <p className="text-[9px] text-slate-200 mt-0.5 truncate">{outbreak.village}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-300">
            Legend: <span className="text-rose-400 font-bold">● High Severity Cluster</span> | <span className="text-amber-400 font-bold">● Emerging Hotspot</span>
          </div>
        </div>
      </Card>

      {/* Cluster Table */}
      <Card className="p-5 space-y-4">
        <h2 className="font-bold text-slate-900 text-sm">Active Epidemiological Clusters & Interventions</h2>

        <div className="space-y-3">
          {filtered.map(outbreak => (
            <div key={outbreak.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">{outbreak.disease} Hotspot Cluster</span>
                  <Badge variant={outbreak.severity === 'high' ? 'danger' : 'warning'} className="uppercase text-[10px]">
                    {outbreak.severity} Risk
                  </Badge>
                  <span className="text-xs font-semibold text-rose-700">{outbreak.casesCount} Affected Citizens</span>
                </div>
                <p className="text-xs text-slate-600">
                  Location: <strong>{outbreak.village}</strong>, {outbreak.taluka} Taluka, <strong>{outbreak.district}</strong> District
                </p>
                <p className="text-xs text-slate-500">First Detected: {outbreak.reportedDate} • Surveillance Protocol: Active Daily Door-to-Door</p>
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
