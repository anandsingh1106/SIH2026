import React from 'react';
import { Patient } from '@arogyasetu/shared/types';
import { TriageBadge } from './TriageBadge';
import { User, Phone, MapPin, AlertOctagon, Heart } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const PatientSummaryCard: React.FC<{ patient: Patient; className?: string }> = ({
  patient,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gov-100 border border-gov-300 flex items-center justify-center text-gov-800 font-bold text-base shrink-0">
          {(patient.name ?? '?').charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-ink text-base">{patient.name}</h3>
            {patient.nameMr && <span className="text-xs text-ink-soft font-medium">({patient.nameMr})</span>}
            <TriageBadge priority={patient.riskCategory === 'critical' ? 'critical' : patient.riskCategory === 'high' ? 'high' : patient.riskCategory === 'moderate' ? 'moderate' : 'low'} size="sm" />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft mt-1">
            <span className="font-semibold text-sand-700">
              {patient.age ?? '—'} Yrs / {(patient.gender ?? 'other').toUpperCase()}
            </span>
            <span>•</span>
            <span className="font-mono text-gov-800 bg-gov-50 px-1.5 py-0.5 rounded border border-gov-200">
              ABHA: {patient.abhaId}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-ink-soft" />
              {patient.phone}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-ink-soft" />
              {patient.village}, {patient.district}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {patient.allergies && patient.allergies.length > 0 && (
          <div className="flex items-center gap-1 bg-red-50 text-red-800 border border-red-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>Allergic: {patient.allergies.join(', ')}</span>
          </div>
        )}
        {patient.chronicConditions && patient.chronicConditions.map((c, i) => (
          <Badge key={i} variant="secondary" size="sm">
            {c}
          </Badge>
        ))}
      </div>
    </div>
  );
};
