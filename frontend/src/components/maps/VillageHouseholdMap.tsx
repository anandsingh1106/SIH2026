import React, { useCallback, useRef, useState } from 'react';
import { Home, MapPin, User, AlertTriangle, CheckCircle, Navigation, Phone, Calendar, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
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
  const [hoveredHh, setHoveredHh] = useState<string | null>(null);

  // Pan/zoom over the 0-100 SVG user space. Kept in state rather than CSS
  // transform so the pins keep their true coordinates and stay clickable.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const clampPan = useCallback((p: { x: number; y: number }, z: number) => {
    // At zoom z the visible window is 100/z wide, so the pan may range over
    // whatever is left. Without this the map can be dragged into empty space.
    const limit = Math.max(0, 100 - 100 / z);
    return {
      x: Math.min(Math.max(p.x, 0), limit),
      y: Math.min(Math.max(p.y, 0), limit),
    };
  }, []);

  const zoomBy = (factor: number) => {
    setZoom((z) => {
      const next = Math.min(Math.max(z * factor, 1), 4);
      // Zoom about the centre of the current view.
      setPan((p) => {
        const cx = p.x + 50 / z;
        const cy = p.y + 50 / z;
        return clampPan({ x: cx - 50 / next, y: cy - 50 / next }, next);
      });
      return next;
    });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (zoom <= 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Convert pixel drag into SVG user units for the current zoom level.
    const dx = ((e.clientX - d.x) / rect.width) * (100 / zoom);
    const dy = ((e.clientY - d.y) / rect.height) * (100 / zoom);
    setPan(clampPan({ x: d.panX - dx, y: d.panY - dy }, zoom));
  };

  const endDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

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
        return 'fill-red-600 stroke-white';
      case 'high_risk':
        return 'fill-saffron-500 stroke-white';
      case 'visited':
        return 'fill-emerald-600 stroke-white';
      default:
        return 'fill-gov-600 stroke-white';
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-line p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-ink text-base flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gov-700" />
            {villageName} — Frontline Household Health Map
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Real-time geolocation tagging for maternal care, immunization, and NCD screenings
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-sand-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === 'all' ? 'bg-surface text-gov-800 shadow-2xs font-bold' : 'text-ink-muted hover:text-ink'
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
            Critical Maternal ({households.filter((h) => h.status === 'critical').length})
          </button>
          <button
            onClick={() => setFilter('high_risk')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === 'high_risk' ? 'bg-saffron-600 text-white font-bold' : 'text-saffron-800 hover:bg-saffron-50'
            }`}
          >
            High Risk ({households.filter((h) => h.status === 'high_risk').length})
          </button>
        </div>
      </div>

      {/* Interactive Map Visualizer */}
      <div className="relative w-full h-[440px] bg-emerald-50/50 rounded-2xl border border-emerald-100 overflow-hidden select-none">
        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 rounded-xl border border-line bg-surface/95 backdrop-blur-sm p-1 shadow-card">
          <button
            onClick={() => zoomBy(1.5)}
            disabled={zoom >= 4}
            aria-label="Zoom in"
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-sand-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => zoomBy(1 / 1.5)}
            disabled={zoom <= 1}
            aria-label="Zoom out"
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-sand-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
            aria-label="Reset view"
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-sand-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Showing-count pill */}
        <div className="absolute top-3 left-3 z-20 rounded-full border border-line bg-surface/95 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-ink-muted shadow-card">
          Showing {filteredHouseholds.length} of {households.length} households
          {zoom > 1 && <span className="text-ink-soft"> · {zoom.toFixed(1)}x</span>}
        </div>

        {/* Subtle terrain contours */}
        <svg
          className={`w-full h-full touch-none ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
          viewBox={`${pan.x} ${pan.y} ${100 / zoom} ${100 / zoom}`}
          preserveAspectRatio="none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
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
          {filteredHouseholds.map((hh) => {
            const isHovered = hoveredHh === hh.id;
            // Labels and strokes are drawn in SVG user units, so they would
            // balloon as the view zooms. Dividing by zoom keeps them constant.
            const k = 1 / zoom;

            return (
              <g
                key={hh.id}
                transform={`translate(${hh.x}, ${hh.y})`}
                className="cursor-pointer focus:outline-none"
                tabIndex={0}
                role="button"
                aria-label={`Household ${hh.number}, ${hh.headName}, ${hh.status.replace('_', ' ')}`}
                onMouseEnter={() => setHoveredHh(hh.id)}
                onMouseLeave={() => setHoveredHh(null)}
                onFocus={() => setHoveredHh(hh.id)}
                onBlur={() => setHoveredHh(null)}
                onClick={() => {
                  setSelectedHh(hh);
                  if (onSelectHousehold) onSelectHousehold(hh);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedHh(hh);
                    if (onSelectHousehold) onSelectHousehold(hh);
                  }
                }}
              >
                {/* Attention halo on the critical cases only -- if everything
                    pulses, nothing reads as urgent. */}
                {hh.status === 'critical' && (
                  <circle
                    r={6 * k}
                    className="fill-red-500/25 animate-ping"
                    style={{ transformOrigin: 'center' }}
                  />
                )}

                <circle
                  r={(isHovered ? 5.2 : 4) * k}
                  className={getPinColor(hh.status)}
                  strokeWidth={1.2 * k}
                  style={{ transition: 'r 150ms ease-out' }}
                />

                <text
                  y={1.2 * k}
                  fontSize={2.4 * k}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {hh.number.replace('HH-', '')}
                </text>

                <text
                  y={(isHovered ? 7.6 : 6.5) * k}
                  fontSize={2 * k}
                  textAnchor="middle"
                  fill="#2d2418"
                  fontWeight="bold"
                  pointerEvents="none"
                  style={{
                    paintOrder: 'stroke',
                    stroke: 'rgba(255,253,249,0.85)',
                    strokeWidth: 0.7 * k,
                    strokeLinejoin: 'round',
                    transition: 'y 150ms ease-out',
                  }}
                >
                  {isHovered ? hh.headName : hh.headName.split(' ')[0]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Legend */}
        <div className="absolute bottom-3 left-3 z-20 bg-surface/95 backdrop-blur-sm p-2.5 rounded-xl border border-line shadow-card text-[11px] space-y-1.5">
          <div className="font-bold text-ink border-b border-line pb-1">Map Legend</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <span>Critical Emergency Case</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-saffron-500" />
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
              <span className="text-xs text-ink-soft font-medium">GPS Accuracy: ± 3m</span>
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
              <h5 className="text-xs font-bold text-sand-700 uppercase tracking-wider mb-2">
                Active Health Alerts & Required Actions:
              </h5>
              <div className="space-y-2">
                {selectedHh.alerts.map((a, i) => (
                  <div
                    key={i}
                    className="p-3 bg-saffron-50 border border-saffron-200 rounded-xl text-xs font-semibold text-saffron-900 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-saffron-600 shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-raised p-3 rounded-xl border border-line text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-soft">Scheduled Visit:</span>
                <span className="font-semibold text-ink">Today, 09:30 AM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Assigned Task:</span>
                <span className="font-semibold text-gov-800">{selectedHh.dueTask}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Primary Contact:</span>
                <span className="font-semibold text-ink">+91 97654 32109</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
