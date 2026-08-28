import React, { useState } from 'react';
import { Bed, Activity, CheckCircle, AlertTriangle, Building2, UserPlus, Filter, ShieldCheck, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { INITIAL_FACILITIES, INITIAL_REFERRALS } from '../../data/mockData';

interface WardBed {
  id: string;
  bedNumber: string;
  wardType: 'ICU' | 'CCU' | 'HDU' | 'General Male' | 'General Female' | 'Maternity / NICU';
  oxygenSupport: boolean;
  ventilator: boolean;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  occupiedByPatientName?: string;
  occupiedSince?: string;
  assignedDoctor?: string;
}

const MOCK_BEDS: WardBed[] = [
  { id: 'b-101', bedNumber: 'ICU-01', wardType: 'ICU', oxygenSupport: true, ventilator: true, status: 'occupied', occupiedByPatientName: 'Suresh More', occupiedSince: '21 Aug 2026', assignedDoctor: 'Dr. Priya Kulkarni' },
  { id: 'b-102', bedNumber: 'ICU-02', wardType: 'ICU', oxygenSupport: true, ventilator: true, status: 'available' },
  { id: 'b-103', bedNumber: 'ICU-03', wardType: 'ICU', oxygenSupport: true, ventilator: false, status: 'reserved', occupiedByPatientName: 'Referral #REF-9921 Incoming' },
  { id: 'b-201', bedNumber: 'CCU-01', wardType: 'CCU', oxygenSupport: true, ventilator: true, status: 'occupied', occupiedByPatientName: 'Eknath Shinde', occupiedSince: '22 Aug 2026', assignedDoctor: 'Dr. Priya Kulkarni' },
  { id: 'b-202', bedNumber: 'CCU-02', wardType: 'CCU', oxygenSupport: true, ventilator: false, status: 'available' },
  { id: 'b-301', bedNumber: 'HDU-01', wardType: 'HDU', oxygenSupport: true, ventilator: false, status: 'available' },
  { id: 'b-302', bedNumber: 'HDU-02', wardType: 'HDU', oxygenSupport: true, ventilator: false, status: 'occupied', occupiedByPatientName: 'Kavita Jadhav', occupiedSince: '19 Aug 2026', assignedDoctor: 'Dr. Arvind Mehra' },
  { id: 'b-401', bedNumber: 'GM-14', wardType: 'General Male', oxygenSupport: false, ventilator: false, status: 'available' },
  { id: 'b-402', bedNumber: 'GM-15', wardType: 'General Male', oxygenSupport: true, ventilator: false, status: 'occupied', occupiedByPatientName: 'Pandurang Ghadge', occupiedSince: '20 Aug 2026', assignedDoctor: 'Dr. Rajesh Deshmukh' },
  { id: 'b-501', bedNumber: 'GF-08', wardType: 'General Female', oxygenSupport: false, ventilator: false, status: 'available' },
  { id: 'b-502', bedNumber: 'GF-09', wardType: 'General Female', oxygenSupport: true, ventilator: false, status: 'cleaning' },
];

export const SpecialistBedAvailability: React.FC = () => {
  const [beds, setBeds] = useState<WardBed[]>(MOCK_BEDS);
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [reserveModal, setReserveModal] = useState<WardBed | null>(null);
  const [selectedReferral, setSelectedReferral] = useState<string>('');

  const totalBeds = beds.length;
  const availableBeds = beds.filter(b => b.status === 'available').length;
  const icuAvailable = beds.filter(b => b.wardType === 'ICU' && b.status === 'available').length;
  const ventAvailable = beds.filter(b => b.ventilator && b.status === 'available').length;

  const filteredBeds = wardFilter === 'all' ? beds : beds.filter(b => b.wardType === wardFilter);

  const handleReserveBed = () => {
    if (!reserveModal) return;
    setBeds(prev => prev.map(b => b.id === reserveModal.id ? {
      ...b,
      status: 'reserved',
      occupiedByPatientName: selectedReferral ? `Referral #${selectedReferral}` : 'Incoming Emergency Case',
    } : b));
    setReserveModal(null);
    setSelectedReferral('');
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Specialist Workspace' }, { label: 'Live Bed & ICU Matrix' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <Bed className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Hospital Bed & ICU Live Matrix</h1>
            <p className="text-sm text-ink-soft">Real-time bed availability, ventilator telemetry, and emergency admission reservations</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="px-3 py-1 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 inline mr-1" /> Telemetry Live Sync
          </Badge>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <p className="text-xs font-bold text-emerald-800 uppercase">Available Beds</p>
          <p className="text-2xl font-bold text-emerald-950 mt-1">{availableBeds} <span className="text-xs font-normal text-emerald-700">/ {totalBeds} total</span></p>
        </Card>
        <Card className="p-4 bg-indigo-50 border-indigo-200">
          <p className="text-xs font-bold text-indigo-800 uppercase">ICU Beds Free</p>
          <p className="text-2xl font-bold text-indigo-950 mt-1">{icuAvailable}</p>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-xs font-bold text-blue-800 uppercase">Ventilator Beds</p>
          <p className="text-2xl font-bold text-blue-950 mt-1">{ventAvailable} available</p>
        </Card>
        <Card className="p-4 bg-amber-50 border-amber-200">
          <p className="text-xs font-bold text-amber-800 uppercase">Reserved / Transit</p>
          <p className="text-2xl font-bold text-amber-950 mt-1">{beds.filter(b => b.status === 'reserved').length}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'ICU', 'CCU', 'HDU', 'General Male', 'General Female'].map(wf => (
          <button
            key={wf}
            onClick={() => setWardFilter(wf)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              wardFilter === wf
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-surface text-ink-muted border border-line hover:bg-sand-50'
            }`}
          >
            {wf === 'all' ? 'All Wards' : wf}
          </button>
        ))}
      </div>

      {/* Beds Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredBeds.map(bed => {
          const isAvailable = bed.status === 'available';
          const isOccupied = bed.status === 'occupied';
          const isReserved = bed.status === 'reserved';

          return (
            <Card
              key={bed.id}
              className={`p-4 border transition-all ${
                isAvailable ? 'border-emerald-300 bg-emerald-50/20' :
                isOccupied ? 'border-line bg-surface' :
                isReserved ? 'border-amber-300 bg-amber-50/30' :
                'border-line bg-sand-50 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-base text-ink">{bed.bedNumber}</span>
                  <p className="text-xs font-medium text-ink-soft">{bed.wardType}</p>
                </div>
                <Badge
                  variant={
                    isAvailable ? 'success' :
                    isOccupied ? 'danger' :
                    isReserved ? 'warning' : 'default'
                  }
                  className="capitalize text-[10px]"
                >
                  {bed.status}
                </Badge>
              </div>

              <div className="mt-3 flex gap-1.5 flex-wrap">
                {bed.oxygenSupport && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">O2 Live</span>
                )}
                {bed.ventilator && (
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">Ventilator</span>
                )}
              </div>

              {isOccupied && (
                <div className="mt-3 pt-2 border-t border-line text-xs">
                  <p className="font-semibold text-ink truncate">{bed.occupiedByPatientName}</p>
                  <p className="text-[11px] text-ink-soft mt-0.5">Doctor: {bed.assignedDoctor}</p>
                </div>
              )}

              {isReserved && (
                <div className="mt-3 pt-2 border-t border-amber-200 text-xs text-amber-800">
                  <p className="font-semibold">{bed.occupiedByPatientName}</p>
                  <p className="text-[10px] text-amber-600">Reserved for Emergency Transit</p>
                </div>
              )}

              {isAvailable && (
                <div className="mt-3 pt-2 border-t border-emerald-100">
                  <button
                    onClick={() => setReserveModal(bed)}
                    className="w-full py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Reserve for Patient
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Reserve Modal */}
      <Modal
        isOpen={!!reserveModal}
        onClose={() => setReserveModal(null)}
        title={`Reserve Bed ${reserveModal?.bedNumber} (${reserveModal?.wardType})`}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Link an incoming critical referral to hold this bed and notify the transit ambulance team.
          </p>

          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Select Incoming Referral</label>
            <select
              value={selectedReferral}
              onChange={e => setSelectedReferral(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface"
            >
              <option value="">Direct Emergency Admission (No Referral ID)</option>
              {INITIAL_REFERRALS.map(ref => (
                <option key={ref.id} value={ref.referralCode}>
                  Ref #{ref.referralCode} — {ref.patientName} ({ref.specialty})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleReserveBed}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700"
            >
              Confirm Bed Reservation
            </button>
            <button
              onClick={() => setReserveModal(null)}
              className="px-4 py-2.5 border border-line text-sand-700 text-sm font-semibold rounded-lg hover:bg-sand-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
