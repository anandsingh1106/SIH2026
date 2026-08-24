import React from 'react';
import { Referral, ReferralStatus } from '../../types';
import { CheckCircle2, Clock, Truck, UserCheck, Stethoscope, Activity, CheckSquare, XCircle } from 'lucide-react';

export interface ReferralTimelineWidgetProps {
  currentStatus?: ReferralStatus;
  history?: { status: ReferralStatus; timestamp: string; note?: string; updatedBy?: string }[];
  referral?: Referral;
  compact?: boolean;
}

const STAGES: { key: ReferralStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'created', label: 'Created', icon: <Clock className="w-3.5 h-3.5" /> },
  { key: 'accepted', label: 'Accepted', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { key: 'scheduled', label: 'Scheduled', icon: <Clock className="w-3.5 h-3.5" /> },
  { key: 'in_transit', label: 'In Transit', icon: <Truck className="w-3.5 h-3.5" /> },
  { key: 'arrived', label: 'Arrived', icon: <UserCheck className="w-3.5 h-3.5" /> },
  { key: 'consultation', label: 'Consultation', icon: <Stethoscope className="w-3.5 h-3.5" /> },
  { key: 'treatment', label: 'Treatment', icon: <Activity className="w-3.5 h-3.5" /> },
  { key: 'follow_up', label: 'Follow-up', icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { key: 'closed', label: 'Closed', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

export const ReferralTimelineWidget: React.FC<ReferralTimelineWidgetProps> = ({
  currentStatus,
  history,
  referral,
}) => {
  const resolvedStatus = currentStatus ?? referral?.status ?? 'created';
  const resolvedHistory = history ?? referral?.history ?? [];
  const currentIndex = STAGES.findIndex((s) => s.key === resolvedStatus);

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-6">
        Referral Lifecycle & Care Coordination Progress
      </h4>

      {/* Horizontal Stepper (Desktop & Tablet) */}
      <div className="hidden sm:flex items-center justify-between relative">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 -z-0" />
        <div
          className="absolute top-4 left-0 h-0.5 bg-gov-600 transition-all duration-500 -z-0"
          style={{ width: `${Math.max(0, (currentIndex / (STAGES.length - 1)) * 100)}%` }}
        />

        {STAGES.map((stage, idx) => {
          const isPassed = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={stage.key} className="flex flex-col items-center relative z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-gov-700 text-white ring-4 ring-gov-100 scale-110 shadow-sm'
                    : isPassed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {stage.icon}
              </div>
              <span
                className={`text-[11px] font-medium mt-2 text-center whitespace-nowrap ${
                  isCurrent ? 'text-gov-900 font-bold' : isPassed ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Vertical list for mobile */}
      <div className="sm:hidden space-y-3">
        {STAGES.map((stage, idx) => {
          const isPassed = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          if (idx > currentIndex + 1) return null; // keep compact

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  isCurrent
                    ? 'bg-gov-700 text-white ring-2 ring-gov-200'
                    : isPassed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {stage.icon}
              </div>
              <span className={`text-xs font-medium ${isCurrent ? 'text-gov-800 font-bold' : 'text-slate-600'}`}>
                {stage.label} {isCurrent && '(Current Status)'}
              </span>
            </div>
          );
        })}
      </div>

      {/* History notes */}
      {resolvedHistory.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Activity Log:</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {resolvedHistory.map((h, i) => (
              <div key={i} className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-800 capitalize">{h.status.replace('_', ' ')}:</span>{' '}
                  <span>{h.note || 'Status updated'}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
