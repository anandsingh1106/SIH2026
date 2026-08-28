import React from 'react';
import { Bed } from '../../types';
import { BedDouble, Check, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface BedStatusIndicatorProps {
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  availableIcuBeds: number;
  ventilators?: number;
  availableVentilators?: number;
  className?: string;
}

export const BedStatusIndicator: React.FC<BedStatusIndicatorProps> = ({
  totalBeds,
  availableBeds,
  icuBeds,
  availableIcuBeds,
  ventilators = 0,
  availableVentilators = 0,
  className = '',
}) => {
  const generalOccupancy = Math.round(((totalBeds - availableBeds) / Math.max(1, totalBeds)) * 100);
  const icuOccupancy = Math.round(((icuBeds - availableIcuBeds) / Math.max(1, icuBeds)) * 100);

  return (
    <div className={`rounded-xl border border-line bg-surface p-4 shadow-xs space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-sand-700 uppercase tracking-wider flex items-center gap-1.5">
          <BedDouble className="w-4 h-4 text-gov-700" />
          Live Bed & Critical Care Capacity
        </h4>
        <Badge variant={availableIcuBeds > 0 ? 'success' : 'danger'} size="sm">
          {availableIcuBeds > 0 ? `${availableIcuBeds} ICU Beds Available` : 'ICU Full'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Total General Beds */}
        <div className="bg-sand-50 p-3 rounded-lg border border-line">
          <div className="text-[11px] text-ink-soft font-medium">General Wards</div>
          <div className="text-xl font-bold text-ink mt-1">
            {availableBeds} <span className="text-xs font-normal text-ink-soft">/ {totalBeds} free</span>
          </div>
          <div className="w-full bg-sand-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full ${generalOccupancy > 90 ? 'bg-red-500' : 'bg-gov-600'}`}
              style={{ width: `${generalOccupancy}%` }}
            />
          </div>
        </div>

        {/* ICU Beds */}
        <div className="bg-sand-50 p-3 rounded-lg border border-line">
          <div className="text-[11px] text-ink-soft font-medium">ICU / HDU Units</div>
          <div className="text-xl font-bold text-ink mt-1">
            {availableIcuBeds} <span className="text-xs font-normal text-ink-soft">/ {icuBeds} free</span>
          </div>
          <div className="w-full bg-sand-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full ${icuOccupancy > 90 ? 'bg-red-500' : 'bg-sky-600'}`}
              style={{ width: `${icuOccupancy}%` }}
            />
          </div>
        </div>

        {/* Ventilators */}
        <div className="bg-sand-50 p-3 rounded-lg border border-line col-span-2 sm:col-span-1">
          <div className="text-[11px] text-ink-soft font-medium">Ventilators</div>
          <div className="text-xl font-bold text-ink mt-1">
            {availableVentilators} <span className="text-xs font-normal text-ink-soft">/ {ventilators} free</span>
          </div>
          <div className="w-full bg-sand-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="h-full bg-purple-600"
              style={{ width: `${Math.round(((ventilators - availableVentilators) / Math.max(1, ventilators)) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
