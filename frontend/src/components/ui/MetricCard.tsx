import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number; // percentage change
  changeLabel?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'teal' | 'blue' | 'amber' | 'red' | 'emerald';
  color?: string;
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeLabel = 'vs last month',
  icon,
  variant = 'default',
  color,
  className,
  onClick,
}) => {
  const iconColors = {
    default: 'bg-slate-100 text-slate-700',
    teal: 'bg-gov-100 text-gov-800',
    blue: 'bg-sky-100 text-sky-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    emerald: 'bg-emerald-100 text-emerald-800',
  };

  const borderAccents = {
    default: 'border-slate-200',
    teal: 'border-l-4 border-l-gov-600 border-slate-200',
    blue: 'border-l-4 border-l-sky-600 border-slate-200',
    amber: 'border-l-4 border-l-amber-500 border-slate-200',
    red: 'border-l-4 border-l-red-500 border-slate-200',
    emerald: 'border-l-4 border-l-emerald-600 border-slate-200',
  };

  return (
    <div
      onClick={onClick}
      className={twMerge(
        clsx(
          'rounded-xl bg-white p-5 shadow-soft border transition-all hover:shadow-premium hover:-translate-y-0.5',
          borderAccents[color as keyof typeof borderAccents] ?? borderAccents[variant],
          onClick && 'cursor-pointer hover:border-slate-300',
          className
        )
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        {icon && (
          <div className={clsx('p-2 rounded-xl shrink-0 shadow-2xs', iconColors[variant])}>{icon}</div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <h3 className="text-2xl font-display font-extrabold tracking-tight text-slate-900">{value}</h3>
      </div>

      {(subtitle || change !== undefined) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {change !== undefined && (
            <span
              className={clsx(
                'inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded',
                change > 0
                  ? 'text-emerald-700 bg-emerald-50'
                  : change < 0
                  ? 'text-red-700 bg-red-50'
                  : 'text-slate-600 bg-slate-100'
              )}
            >
              {change > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : change < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {Math.abs(change)}%
            </span>
          )}
          <span className="text-slate-500 text-[11px] truncate">
            {subtitle || changeLabel}
          </span>
        </div>
      )}
    </div>
  );
};
