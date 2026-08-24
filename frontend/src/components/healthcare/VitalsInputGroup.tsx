import React from 'react';
import { Vitals } from '../../types';
import { Input } from '../ui/Input';
import { Heart, Activity, Thermometer, Wind, Scale, Ruler, Droplets } from 'lucide-react';

export interface VitalsInputGroupProps {
  vitals: Vitals;
  onChange: (updated: Vitals) => void;
  disabled?: boolean;
}

export const VitalsInputGroup: React.FC<VitalsInputGroupProps> = ({
  vitals,
  onChange,
  disabled = false,
}) => {
  const handleChange = (field: keyof Vitals, val: string) => {
    const num = val === '' ? undefined : parseFloat(val);
    const updated = { ...vitals, [field]: num };

    // Auto-calculate BMI if weight and height are present
    if (updated.weight && updated.height && updated.height > 0) {
      const heightInMeters = updated.height / 100;
      updated.bmi = parseFloat((updated.weight / (heightInMeters * heightInMeters)).toFixed(1));
    }

    onChange(updated);
  };

  // Helper for Blood Pressure classification
  const getBpStatus = () => {
    if (!vitals.bpSystolic || !vitals.bpDiastolic) return null;
    if (vitals.bpSystolic >= 160 || vitals.bpDiastolic >= 100) {
      return { label: 'Stage 2 Hypertension (Severe)', color: 'text-red-700 bg-red-50 border-red-200' };
    }
    if (vitals.bpSystolic >= 140 || vitals.bpDiastolic >= 90) {
      return { label: 'Stage 1 Hypertension', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    }
    if (vitals.bpSystolic >= 120 && vitals.bpSystolic < 140) {
      return { label: 'Pre-hypertension', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
    }
    return { label: 'Normal Blood Pressure', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  };

  const bpStatus = getBpStatus();

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-gov-700" />
          Vital Signs & Clinical Measurements
        </h4>
        {bpStatus && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${bpStatus.color}`}>
            {bpStatus.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <Input
            label="BP Systolic (mmHg)"
            type="number"
            placeholder="120"
            value={vitals.bpSystolic || ''}
            onChange={(e) => handleChange('bpSystolic', e.target.value)}
            disabled={disabled}
            leftIcon={<Heart className="w-3.5 h-3.5" />}
          />
        </div>

        <div>
          <Input
            label="BP Diastolic (mmHg)"
            type="number"
            placeholder="80"
            value={vitals.bpDiastolic || ''}
            onChange={(e) => handleChange('bpDiastolic', e.target.value)}
            disabled={disabled}
            leftIcon={<Heart className="w-3.5 h-3.5" />}
          />
        </div>

        <div>
          <Input
            label="Pulse Rate (bpm)"
            type="number"
            placeholder="72"
            value={vitals.pulse || ''}
            onChange={(e) => handleChange('pulse', e.target.value)}
            disabled={disabled}
            leftIcon={<Activity className="w-3.5 h-3.5" />}
          />
        </div>

        <div>
          <Input
            label="SpO2 Oxygen (%)"
            type="number"
            placeholder="98"
            value={vitals.spo2 || ''}
            onChange={(e) => handleChange('spo2', e.target.value)}
            disabled={disabled}
            leftIcon={<Wind className="w-3.5 h-3.5" />}
          />
        </div>

        <div>
          <Input
            label="Temperature (°F)"
            type="number"
            step="0.1"
            placeholder="98.6"
            value={vitals.temperature || ''}
            onChange={(e) => handleChange('temperature', e.target.value)}
            disabled={disabled}
            leftIcon={<Thermometer className="w-3.5 h-3.5" />}
          />
        </div>

        <div>
          <Input
            label="Blood Sugar (mg/dL)"
            type="number"
            placeholder="110"
            value={vitals.bloodSugarRandom || ''}
            onChange={(e) => handleChange('bloodSugarRandom', e.target.value)}
            disabled={disabled}
            leftIcon={<Droplets className="w-3.5 h-3.5" />}
          />
        </div>

        <div>
          <Input
            label="Weight (kg)"
            type="number"
            step="0.5"
            placeholder="65"
            value={vitals.weight || ''}
            onChange={(e) => handleChange('weight', e.target.value)}
            disabled={disabled}
            leftIcon={<Scale className="w-3.5 h-3.5" />}
          />
        </div>

        <div>
          <Input
            label="Height (cm)"
            type="number"
            placeholder="165"
            value={vitals.height || ''}
            onChange={(e) => handleChange('height', e.target.value)}
            disabled={disabled}
            leftIcon={<Ruler className="w-3.5 h-3.5" />}
          />
        </div>
      </div>
    </div>
  );
};
