import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bed as BedIcon, UserPlus, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { dataService } from '../../services/api/dataService';
import type { Bed, Referral } from '../../types';

/** Wards a bed can belong to, in the order a ward board is usually read. */
const WARD_ORDER: Bed['type'][] = ['icu', 'ventilator', 'emergency', 'isolation', 'general'];

const WARD_LABEL: Record<Bed['type'], string> = {
  icu: 'ICU',
  ventilator: 'Ventilator',
  emergency: 'Emergency',
  isolation: 'Isolation',
  general: 'General',
};

/** A bed's effective status: the API sends `status`, older rows only `isOccupied`. */
function statusOf(bed: Bed): 'available' | 'occupied' | 'reserved' {
  if (bed.status) return bed.status;
  return bed.isOccupied ? 'occupied' : 'available';
}

export const SpecialistBedAvailability: React.FC = () => {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [wardFilter, setWardFilter] = useState<'all' | Bed['type']>('all');
  const [reserveModal, setReserveModal] = useState<Bed | null>(null);
  const [selectedReferral, setSelectedReferral] = useState<string>('');
  const [actionError, setActionError] = useState('');

  const loadBeds = useCallback(async () => {
    const rows = await dataService.getBeds();
    setBeds(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([dataService.getBeds(), dataService.getReferrals()])
      .then(([bedRows, referralRows]) => {
        if (cancelled) return;
        setBeds(bedRows);
        setReferrals(referralRows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A bed allocated or released anywhere else must appear here without a manual
  // refresh — that is what makes this a live board rather than a snapshot.
  useEffect(() => {
    return dataService.subscribe((event) => {
      if (event.entity === 'beds' || event.entity === 'bed') loadBeds();
    });
  }, [loadBeds]);

  // Beds also move when other staff act, so poll while the board is open.
  useEffect(() => {
    const id = setInterval(loadBeds, 30_000);
    return () => clearInterval(id);
  }, [loadBeds]);

  const totalBeds = beds.length;
  const availableBeds = useMemo(() => beds.filter((b) => statusOf(b) === 'available').length, [beds]);
  const icuAvailable = useMemo(
    () => beds.filter((b) => b.type === 'icu' && statusOf(b) === 'available').length,
    [beds]
  );
  const ventAvailable = useMemo(
    () => beds.filter((b) => b.type === 'ventilator' && statusOf(b) === 'available').length,
    [beds]
  );
  const reservedCount = useMemo(() => beds.filter((b) => statusOf(b) === 'reserved').length, [beds]);

  /** Only offer ward filters for wards that actually exist in the data. */
  const wardsPresent = useMemo(() => {
    const set = new Set(beds.map((b) => b.type));
    return WARD_ORDER.filter((w) => set.has(w));
  }, [beds]);

  const filteredBeds = useMemo(() => {
    const list = wardFilter === 'all' ? beds : beds.filter((b) => b.type === wardFilter);
    return [...list].sort((a, b) => {
      const wa = WARD_ORDER.indexOf(a.type);
      const wb = WARD_ORDER.indexOf(b.type);
      if (wa !== wb) return wa - wb;
      return (a.bedNumber ?? '').localeCompare(b.bedNumber ?? '');
    });
  }, [beds, wardFilter]);

  const handleReserveBed = async () => {
    if (!reserveModal) return;
    setActionError('');
    try {
      await dataService.updateBedStatus(reserveModal.id, 'reserved');
      await loadBeds();
      setReserveModal(null);
      setSelectedReferral('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not reserve the bed.');
    }
  };

  const handleRelease = async (bed: Bed) => {
    setActionError('');
    try {
      await dataService.updateBedStatus(bed.id, 'available');
      await loadBeds();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not release the bed.');
    }
  };

  /**
   * Referrals still in flight are the ones worth offering in the picker — a
   * closed referral has nobody left to admit, and one already under treatment
   * has a bed.
   */
  const openReferrals = useMemo(
    () => referrals.filter((r) => r.status !== 'closed' && r.status !== 'treatment'),
    [referrals]
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Specialist Workspace' }, { label: 'Live Bed & ICU Matrix' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <BedIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Hospital Bed &amp; ICU Live Matrix</h1>
            <p className="text-sm text-ink-soft">
              Bed occupancy across facilities, updating as beds are allocated and released
            </p>
          </div>
        </div>

        <Badge variant="success" className="px-3 py-1 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 inline mr-1" /> Live
        </Badge>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          {actionError}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <p className="text-xs font-bold text-emerald-800 uppercase">Available Beds</p>
          <p className="text-2xl font-bold text-emerald-950 mt-1">
            {availableBeds} <span className="text-xs font-normal text-emerald-700">/ {totalBeds} total</span>
          </p>
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
          <p className="text-xs font-bold text-amber-800 uppercase">Reserved</p>
          <p className="text-2xl font-bold text-amber-950 mt-1">{reservedCount}</p>
        </Card>
      </div>

      {/* Filters */}
      {wardsPresent.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', ...wardsPresent] as const).map((wf) => (
            <button
              key={wf}
              onClick={() => setWardFilter(wf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                wardFilter === wf
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-surface text-ink-muted border border-line hover:bg-sand-50'
              }`}
            >
              {wf === 'all' ? 'All Wards' : WARD_LABEL[wf]}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <Card className="p-8 text-center text-sm text-ink-soft">Loading bed board…</Card>
      )}

      {!loading && filteredBeds.length === 0 && (
        <Card className="p-8 text-center text-sm text-ink-soft">
          {beds.length === 0 ? 'No beds recorded at your facilities.' : 'No beds in this ward.'}
        </Card>
      )}

      {/* Beds Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredBeds.map((bed) => {
          const status = statusOf(bed);
          const isAvailable = status === 'available';
          const isOccupied = status === 'occupied';
          const isReserved = status === 'reserved';

          return (
            <Card
              key={bed.id}
              className={`p-4 border transition-all ${
                isAvailable
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : isReserved
                  ? 'border-amber-300 bg-amber-50/30'
                  : 'border-line bg-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono font-bold text-base text-ink">{bed.bedNumber}</span>
                  <p className="text-xs font-medium text-ink-soft">
                    {bed.department || WARD_LABEL[bed.type]}
                  </p>
                </div>
                <Badge
                  variant={isAvailable ? 'success' : isReserved ? 'warning' : 'danger'}
                  className="capitalize text-[10px] shrink-0"
                >
                  {status}
                </Badge>
              </div>

              <div className="mt-3 flex gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 bg-sand-100 text-sand-800 text-[10px] font-bold rounded">
                  {WARD_LABEL[bed.type]}
                </span>
                {bed.facilityName && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded truncate max-w-full">
                    {bed.facilityName}
                  </span>
                )}
              </div>

              {isOccupied && (
                <div className="mt-3 pt-2 border-t border-line text-xs">
                  <p className="font-semibold text-ink truncate">
                    {bed.patientName ?? 'Occupied'}
                  </p>
                  {bed.allocatedAt && (
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      Since {new Date(bed.allocatedAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  )}
                  <button
                    onClick={() => handleRelease(bed)}
                    className="mt-2 w-full py-1.5 border border-line text-ink-soft text-xs font-bold rounded-lg hover:bg-sand-50 transition-colors"
                  >
                    Release Bed
                  </button>
                </div>
              )}

              {isReserved && (
                <div className="mt-3 pt-2 border-t border-amber-200 text-xs text-amber-800">
                  <p className="font-semibold">Held for incoming patient</p>
                  <button
                    onClick={() => handleRelease(bed)}
                    className="mt-2 w-full py-1.5 border border-amber-300 text-amber-800 text-xs font-bold rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    Cancel Reservation
                  </button>
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
        title={`Reserve Bed ${reserveModal?.bedNumber ?? ''}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Hold this bed for an incoming patient. It stays reserved until someone is admitted to it
            or the reservation is cancelled.
          </p>

          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">
              Incoming referral (optional)
            </label>
            <select
              value={selectedReferral}
              onChange={(e) => setSelectedReferral(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface"
            >
              <option value="">Direct emergency admission</option>
              {openReferrals.map((ref) => (
                <option key={ref.id} value={ref.id}>
                  {ref.referralCode ? `Ref #${ref.referralCode} — ` : ''}
                  {ref.patientName}
                  {ref.specialty ? ` (${ref.specialty})` : ''}
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
