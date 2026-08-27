import React from 'react';
import { ArrowRightLeft, CheckCircle, Clock, MapPin, User, ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { ReferralTimelineWidget } from '../../components/healthcare/ReferralTimelineWidget';
import { INITIAL_REFERRALS, INITIAL_PATIENTS } from '../../data/mockData';

export const PatientReferralStatus: React.FC = () => {
  const patient = INITIAL_PATIENTS[0];
  const referrals = INITIAL_REFERRALS.filter(r => r.patientId === patient.id);

  const PRIORITY_CONFIG = {
    critical: { variant: 'danger' as const, label: 'Critical' },
    high: { variant: 'warning' as const, label: 'High' },
    moderate: { variant: 'info' as const, label: 'Moderate' },
    low: { variant: 'default' as const, label: 'Low' },
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Patient Portal' }, { label: 'Referral Status' }]} />

      <div className="flex items-center gap-3">
        <ArrowRightLeft className="w-6 h-6 text-gov-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Referral Status</h1>
          <p className="text-sm text-slate-500">Track your specialist referral journey</p>
        </div>
      </div>

      {referrals.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-slate-600">No active referrals</p>
          <p className="text-sm mt-1">If your doctor creates a specialist referral for you, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {referrals.map(referral => {
            const pc = PRIORITY_CONFIG[referral.priority];
            return (
              <Card key={referral.id} className="overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800">Referral #{referral.referralCode}</p>
                        <Badge variant={pc.variant} className="text-xs">{pc.label} Priority</Badge>
                        <Badge variant="info" className="text-xs capitalize">{referral.specialty}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        Referred by {referral.referringDoctorName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{referral.referringFacilityName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Created</p>
                      <p className="text-sm font-semibold text-slate-700">{(referral.createdAt ?? '').split('T')[0]}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Referred to</p>
                        <p className="text-sm font-semibold text-slate-700">{referral.targetFacilityName}</p>
                      </div>
                    </div>
                    {referral.assignedSpecialistName && (
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400">Assigned Specialist</p>
                          <p className="text-sm font-semibold text-slate-700">{referral.assignedSpecialistName}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Score */}
                {referral.aiPriorityScore > 0 && (
                  <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-blue-700">AI Priority Assessment</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-blue-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${referral.aiPriorityScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-blue-700">{referral.aiPriorityScore}/100</span>
                        </div>
                      </div>
                    </div>
                    {referral.aiRationale && (
                      <p className="text-xs text-blue-600 mt-1">{referral.aiRationale}</p>
                    )}
                  </div>
                )}

                {/* Timeline */}
                <div className="p-5">
                  <h3 className="text-sm font-bold text-slate-700 mb-4">Journey Tracker</h3>
                  <ReferralTimelineWidget referral={referral} compact />
                </div>

                {/* Clinical Summary */}
                <div className="px-5 pb-5">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-600 mb-1">Clinical Summary (from your doctor)</p>
                    <p className="text-sm text-slate-700">{referral.clinicalSummary}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Help Note */}
      <Card className="p-4 bg-gov-50 border border-gov-100">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-gov-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-gov-800">What to do while waiting?</p>
            <ul className="mt-2 space-y-1.5 text-xs text-gov-700">
              <li>• Keep taking your current medicines as prescribed</li>
              <li>• Note down any new or worsening symptoms</li>
              <li>• Carry your ABHA card and previous reports to the appointment</li>
              <li>• Call 108 immediately if your condition worsens suddenly</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PatientReferralStatus;

