import React, { useState } from 'react';
import { Home, MapPin, User, AlertTriangle, CheckCircle, Navigation, Phone, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

interface Household {
  id: string;
  number: string;
  headName: string;
  pada: string;
  x: number;
  y: number;
  status: 'critical' | 'high_risk' | 'routine' | 'visited';
  membersCount: number;
  alerts: string[];
  patientName?: string;
  patientId?: string;
  dueTask?: string;
}

export const VillageHouseholdMap: React.FC<{ villageName?: string; onSelectHousehold?: (hh: Household) => void }> = ({
  villageName = 'Paud Village (Mulshi Block)',
  onSelectHousehold,
}) => {
  const [selectedHh, setSelectedHh] = useState<Household | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high_risk' | 'pending'>('all');

  const households: Household[] = [
    { id: 'hh-1', number: 'HH-104', headName: 'Sachin Gaikwad', pada: 'Kolvan Road', x: 28, y: 35, status: 'critical', membersCount: 4, alerts: ['Kavita Gaikwad (28 Wks ANC, Severe Anemia)', 'Aarav Gaikwad (MR-1 Vaccine Due)'], patientName: 'Kavita Gaikwad', patientId: 'pat-102', dueTask: '108 Ambulance Coordination' },
    { id: 'hh-2', number: 'HH-042', headName: 'Ramesh Patil', pada: 'Vetal Pada', x: 55, y: 22, status: 'high_risk', membersCount: 5, alerts: ['Ramesh Patil (BP 146/94, T2DM Follow-up)'], patientName: 'Ramesh Patil', patientId: 'pat-101', dueTask: 'Monthly Blood Sugar Check' },
    { id: 'hh-3', number: 'HH-089', headName: 'Eknath Shinde', pada: 'Wadi Vasti', x: 75, y: 60, status: 'high_risk', membersCount: 3, alerts: ['Eknath Shinde (Chest pain referral to Aundh)'], patientName: 'Eknath Shinde', patientId: 'pat-103', dueTask: 'Transport Verification' },
    { id: 'hh-4', number: 'HH-012', headName: 'Anandrao Jadhav', pada: 'Gaothan', x: 42, y: 68, status: 'routine', membersCount: 6, alerts: ['Vandana Jadhav (CBAC 30+ Screening Due)'], patientName: 'Vandana Jadhav', dueTask: 'CBAC Survey' },
    { id: 'hh-5', number: 'HH-031', headName: 'Sunil More', pada: 'Koliwada', x: 20, y: 72, status: 'visited', membersCount: 4, alerts: ['PNC Visit Day 14 Completed'], dueTask: 'Completed' },
    { id: 'hh-6', number: 'HH-067', headName: 'Mahadev Bhosale', pada: 'Vetal Pada', x: 62, y: 40, status: 'routine', membersCount: 3, alerts: ['Deworming Tablet Distribution'], dueTask: 'Albendazole Follow-up' },
  ];

  const filteredHouseholds = households.filter((h) => {
    if (filter === 'critical') return h.status === 'critical';
    if (filter === 'high_risk') return h.status === 'high_risk';
    if (filter === 'pending') return h.status !== 'visited';
    return true;
  });

  const getPinColor = (status: Household['status']) => {
    switch (status) {
      case 'critical':
        return 'fill-red-600 stroke-white animate-bounce';
      case 'high_risk':
        return 'fill-amber-500 stroke-white';
      case 'visited':
        return 'fill-emerald-600 stroke-white';
      default:
        return 'fill-gov-600 stroke-white';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gov-700" />
            {villageName} — Frontline Household Health Map
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time geolocation tagging for maternal care, immunization, and NCD screenings
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === 'all' ? 'bg-white text-gov-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Households ({households.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === 'critical' ? 'bg-red-600 text-white font-bold' : 'text-red-700 hover:bg-red-50'
            }`}
          >
            Critical Maternal (1)
          </button>
          <button
            onClick={() => setFilter('high_risk')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === 'high_risk' ? 'bg-amber-600 text-white font-bold' : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            High Risk (2)
          </button>
        </div>
      </div>

      {/* Interactive Map Visualizer */}
      <div className="relative w-full h-[400px] bg-emerald-50/50 rounded-xl border border-emerald-100 overflow-hidden select-none">
        {/* Subtle terrain contours */}
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <radialGradient id="gradTerrain" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f0fdf4" stopOpacity="0.4" />
            </radialGradient>
          </defs>
          <rect width="100" height="100" fill="url(#gradTerrain)" />

          {/* Village stream / river */}
          <path
            d="M0,45 Q30,60 50,40 T100,65"
            fill="none"
            stroke="#93c5fd"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* Village unpaved road networks */}
          <path d="M10,10 L50,45 L90,20 M50,45 L40,90 M50,45 L80,85" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeDasharray="2 1" />

          {/* PHC Subcenter / Anganwadi Center Landmark */}
          <g transform="translate(48, 42)">
            <circle r="4" fill="#0f766e" />
            <circle r="7" fill="none" stroke="#0f766e" strokeWidth="0.8" strokeDasharray="1 1" />
            <text x="6" y="2" fontSize="2.8" fontWeight="bold" fill="#0f766e">
              PHC Paud Subcenter
            </text>
          </g>

          {/* Anganwadi #2 */}
          <g transform="translate(24, 30)">
            <rect x="-3" y="-3" width="6" height="6" fill="#f59e0b" rx="1" />
            <text x="4" y="1" fontSize="2.4" fontWeight="bold" fill="#b45309">
              Anganwadi 01
            </text>
          </g>

          {/* Household Pins */}
          {filteredHouseholds.map((hh) => (
            <g
              key={hh.id}
              transform={`translate(${hh.x}, ${hh.y})`}
              className="cursor-pointer transition-transform hover:scale-125"
              onClick={() => {
                setSelectedHh(hh);
                if (onSelectHousehold) onSelectHousehold(hh);
              }}
            >
              <circle r="4" className={getPinColor(hh.status)} strokeWidth="1" />
              <text
                x="0"
                y="1.2"
                fontSize="2.4"
                textAnchor="middle"
                fill="#ffffff"
                fontWeight="bold"
              >
                {hh.number.replace('HH-', '')}
              </text>
              <text
                x="0"
                y="6.5"
                fontSize="2"
                textAnchor="middle"
                fill="#334155"
                fontWeight="bold"
              >
                {hh.headName.split(' ')[0]}
              </text>
            </g>
          ))}
        </svg>

        {/* Floating Legend */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 shadow-sm text-[11px] space-y-1.5">
          <div className="font-bold text-slate-800 border-b pb-1">Map Legend</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <span>Critical Emergency Case</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>High Risk / Due Visit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gov-600" />
            <span>Routine Monitoring</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Visited & Complete</span>
          </div>
        </div>
      </div>

      {/* Household Detail Modal */}
      {selectedHh && (
        <Modal
          isOpen={!!selectedHh}
          onClose={() => setSelectedHh(null)}
          title={`Household: ${selectedHh.number} — ${selectedHh.headName}`}
          description={`Location: ${selectedHh.pada}, Paud Village • ${selectedHh.membersCount} Family Members`}
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500 font-medium">GPS Accuracy: ± 3m</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedHh(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Navigation className="w-3.5 h-3.5" />}
                  onClick={() => {
                    alert(`Starting GPS navigation to Household ${selectedHh.number} in ${selectedHh.pada}.`);
                    setSelectedHh(null);
                  }}
                >
                  Start Navigation
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Active Health Alerts & Required Actions:
              </h5>
              <div className="space-y-2">
                {selectedHh.alerts.map((a, i) => (
                  <div
                    key={i}
                    className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-900 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Visit:</span>
                <span className="font-semibold text-slate-800">Today, 09:30 AM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Task:</span>
                <span className="font-semibold text-gov-800">{selectedHh.dueTask}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Primary Contact:</span>
                <span className="font-semibold text-slate-800">+91 97654 32109</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
