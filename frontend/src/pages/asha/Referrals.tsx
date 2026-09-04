import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/api/dataService';
import { Referral } from '@arogyasetu/shared/types';
import { ArrowRightLeft, Clock, CheckCircle2, Truck, AlertTriangle, Building2, Phone } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Badge } from '../../components/ui/Badge';
import { ReferralTimelineWidget } from '../../components/healthcare/ReferralTimelineWidget';
import { TriageBadge } from '../../components/healthcare/TriageBadge';

export const AshaReferralsPage: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  useEffect(() => {
    dataService.getReferrals().then((list) => {
      setReferrals(list);
      if (list.length > 0) setSelectedReferral(list[0]);
    });

    const unsub = dataService.subscribe(({ entity }) => {
      if (entity === 'referrals') {
        dataService.getReferrals().then(setReferrals);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Village Patient Tele-Referrals Tracker' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-gov-700" />
          Patient Referral & Tertiary Transfer Monitor
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Real-time tracking from village home visit to Sassoon General Hospital / Aundh District Hospital admission
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Referral List (Left 5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-sand-700 uppercase tracking-wider">
            Referred Village Citizens ({referrals.length})
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
                    <span className="font-semibold text-gov-800">To: {(r.targetFacilityName ?? '').split(' ')[0]}</span>
                    <span className="capitalize font-bold text-sand-700 bg-sand-100 px-2 py-0.5 rounded">
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Referral Detailed Timeline (Right 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedReferral ? (
            <div className="space-y-4">
              <ReferralTimelineWidget
                currentStatus={selectedReferral.status}
                history={selectedReferral.history}
              />

              <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="font-bold text-ink text-base">{selectedReferral.patientName}</h3>
                    <p className="text-ink-soft">{selectedReferral.patientAge} Yrs / {selectedReferral.patientGender}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-ink-soft">AI Priority Score</span>
                    <div className="text-xl font-extrabold text-red-600">{selectedReferral.aiPriorityScore} / 100</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-sand-50 p-3.5 rounded-xl border border-line">
                  <div>
                    <span className="text-[11px] text-ink-soft font-medium">Referring Facility:</span>
                    <div className="font-bold text-ink">{selectedReferral.referringFacilityName}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-ink-soft font-medium">Destination Hospital:</span>
                    <div className="font-bold text-gov-800">{selectedReferral.targetFacilityName}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-ink-soft font-medium">Assigned Specialist:</span>
                    <div className="font-bold text-ink">{selectedReferral.assignedSpecialistName || 'Dr. Priya Kulkarni'}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-ink-soft font-medium">Reserved Bed Token:</span>
                    <div className="font-bold text-emerald-700">Maternal ICU Bed 04 (Reserved)</div>
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-ink uppercase tracking-wider mb-1">Clinical Case Summary:</h5>
                  <p className="text-ink-muted leading-relaxed bg-sand-50 p-3 rounded-lg border border-line">
                    {selectedReferral.clinicalSummary}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 bg-surface rounded-2xl border border-line text-center text-xs text-ink-soft">
              Select a referral to inspect its live care coordination timeline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
