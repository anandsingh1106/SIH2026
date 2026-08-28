import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/api/dataService';
import { Referral, Bed, ReferralStatus } from '../../types';
import { ArrowRightLeft, BedDouble, CheckCircle2, AlertTriangle, Truck, Clock, Sparkles, User, FileText } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TriageBadge } from '../../components/healthcare/TriageBadge';
import { ReferralTimelineWidget } from '../../components/healthcare/ReferralTimelineWidget';

export const SpecialistReferralQueuePage: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [isAllocateBedModalOpen, setIsAllocateBedModalOpen] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState<string>('');

  useEffect(() => {
    Promise.all([dataService.getReferrals(), dataService.getBeds()]).then(([rList, bList]) => {
      setReferrals(rList);
      setBeds(bList);
      if (rList.length > 0) setSelectedReferral(rList[0]);
    });
  }, []);

  const handleUpdateStatus = async (newStatus: ReferralStatus) => {
    if (!selectedReferral) return;
    // The acting user is taken from the session server-side.
    const updated = await dataService.updateReferralStatus(
      selectedReferral.id,
      newStatus,
      `Status updated to ${newStatus.replace('_', ' ')}`
    );
    if (updated) {
      setSelectedReferral(updated);
      dataService.getReferrals().then(setReferrals);
    }
  };

  const handleAllocateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferral || !selectedBedId) return;

    await dataService.updateBedStatus(selectedBedId, 'reserved', selectedReferral.patientName);
    const updated = await dataService.updateReferralStatus(
      selectedReferral.id,
      'accepted',
      `Referral accepted and bed ${selectedBedId} reserved`
    );

    if (updated) {
      setSelectedReferral(updated);
      Promise.all([dataService.getReferrals(), dataService.getBeds()]).then(([rList, bList]) => {
        setReferrals(rList);
        setBeds(bList);
      });
    }
    setIsAllocateBedModalOpen(false);
  };

  const availableBeds = beds.filter((b) => b.status === 'available');

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Specialist Workspace', href: '/specialist/dashboard' },
          { label: 'Inward Referral Queue & Bed Allocation' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-gov-700" />
          Tertiary Inward Referral Stream & Bed Dispatch Console
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Review patient transfers from PHCs, assign department beds, and coordinate ambulance handovers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inward Stream List (Left 5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-sand-700 uppercase tracking-wider">
            Inward Transfers ({referrals.length})
          </h3>

          <div className="space-y-2.5">
            {referrals.map((r) => {
              const isSelected = selectedReferral?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReferral(r)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gov-50/60 border-gov-600 shadow-sm ring-2 ring-gov-100'
                      : 'bg-surface border-line hover:bg-sand-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-gov-800 bg-surface px-2 py-0.5 rounded border border-line">
                      {r.referralCode}
                    </span>
                    <TriageBadge priority={r.priority} size="sm" />
                  </div>

                  <h4 className="font-bold text-ink text-sm mt-2">{r.patientName}</h4>
                  <p className="text-xs text-ink-soft line-clamp-1">{r.provisionalDiagnosis}</p>

                  <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between text-xs text-ink-muted">
                    <span className="font-semibold text-gov-800">From: {(r.referringFacilityName ?? '').split(' ')[0]}</span>
                    <span className="capitalize font-bold text-sand-700 bg-sand-100 px-2 py-0.5 rounded">
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Case Inspection & Actions (Right 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedReferral ? (
            <div className="space-y-4">
              <ReferralTimelineWidget
                currentStatus={selectedReferral.status}
                history={selectedReferral.history}
              />

              <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-5 text-xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="font-bold text-ink text-lg">{selectedReferral.patientName}</h3>
                    <p className="text-ink-soft">{selectedReferral.patientAge} Yrs • {selectedReferral.patientGender} • Referring: {selectedReferral.referringFacilityName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-ink-soft font-bold uppercase">AI Triage Severity</span>
                    <div className="text-2xl font-extrabold text-red-600">{selectedReferral.aiPriorityScore} / 100</div>
                  </div>
                </div>

                <div className="bg-sand-50 p-4 rounded-xl border border-line space-y-2">
                  <div className="font-bold text-ink text-sm">
                    Diagnosis: {selectedReferral.provisionalDiagnosis}
                  </div>
                  <p className="text-sand-700 leading-relaxed">
                    {selectedReferral.clinicalSummary}
                  </p>
                </div>

                {/* Status Advancement Actions */}
                <div className="space-y-2 pt-2 border-t border-line">
                  <h5 className="font-bold text-ink uppercase tracking-wider">
                    Specialist Transfer Operations:
                  </h5>

                  <div className="flex flex-wrap gap-2">
                    {selectedReferral.status === 'created' && (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<BedDouble className="w-4 h-4" />}
                        onClick={() => setIsAllocateBedModalOpen(true)}
                      >
                        Accept & Allocate Bed
                      </Button>
                    )}

                    {selectedReferral.status === 'accepted' && (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<Truck className="w-4 h-4" />}
                        onClick={() => handleUpdateStatus('in_transit')}
                      >
                        Confirm 108 Ambulance In-Transit
                      </Button>
                    )}

                    {selectedReferral.status === 'in_transit' && (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={() => handleUpdateStatus('arrived')}
                      >
                        Mark Patient Arrived at Sassoon
                      </Button>
                    )}

                    {selectedReferral.status === 'arrived' && (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={() => handleUpdateStatus('consultation')}
                      >
                        Begin Specialist Bedside Consult
                      </Button>
                    )}

                    {selectedReferral.status === 'consultation' && (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={() => handleUpdateStatus('treatment')}
                      >
                        Initiate Inpatient Treatment
                      </Button>
                    )}

                    {selectedReferral.status === 'treatment' && (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={() => handleUpdateStatus('follow_up')}
                      >
                        Step Down to Follow-Up Care
                      </Button>
                    )}

                    {selectedReferral.status === 'follow_up' && (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={() => handleUpdateStatus('closed')}
                      >
                        Finalize & Close Referral Case
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 bg-surface rounded-2xl border border-line text-center text-xs text-ink-soft">
              Select a referral from the list to inspect case details.
            </div>
          )}
        </div>
      </div>

      {/* Bed Allocation Modal */}
      {isAllocateBedModalOpen && selectedReferral && (
        <Modal
          isOpen={isAllocateBedModalOpen}
          onClose={() => setIsAllocateBedModalOpen(false)}
          title={`Allocate Bed for ${selectedReferral.patientName}`}
          description={`Specialty: ${selectedReferral.specialty} • Priority: ${(selectedReferral.priority ?? '').toUpperCase()}`}
          size="md"
        >
          <form onSubmit={handleAllocateBed} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1.5">
                Select Department Bed ({availableBeds.length} Available)
              </label>
              <select
                required
                value={selectedBedId}
                onChange={(e) => setSelectedBedId(e.target.value)}
                className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink font-semibold focus:outline-none focus:border-gov-600"
              >
                <option value="">-- Choose Bed --</option>
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bedNumber} ({b.department} • {(b.type ?? '').toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-gov-50 border border-gov-200 rounded-xl text-xs text-gov-900">
              Allocating a bed reserves the token, generates a digital admission pass, and notifies the referring PHC Doctor and ASHA worker.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsAllocateBedModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={!selectedBedId}>
                Confirm Bed Reservation
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
