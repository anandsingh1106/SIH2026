import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number; // percentage change
  changeLabel?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'teal' | 'blue' | 'amber' | 'red' | 'emerald' | 'saffron';
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
  const animatedValue = useCountUp(value);

  const iconColors = {
    default: 'bg-sand-100 text-sand-700 group-hover:bg-sand-200',
    teal: 'bg-gov-100 text-gov-800 group-hover:bg-gov-200',
    blue: 'bg-sky-100 text-sky-800 group-hover:bg-sky-200',
    amber: 'bg-saffron-100 text-saffron-800 group-hover:bg-saffron-200',
    saffron: 'bg-saffron-100 text-saffron-800 group-hover:bg-saffron-200',
    red: 'bg-red-100 text-red-800 group-hover:bg-red-200',
    emerald: 'bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200',
  };

  const accents = {
    default: 'before:bg-sand-300',
    teal: 'before:bg-gov-600',
    blue: 'before:bg-sky-600',
    amber: 'before:bg-saffron-500',
    saffron: 'before:bg-saffron-500',
    red: 'before:bg-red-500',
    emerald: 'before:bg-emerald-600',
  };

  const key = (color as keyof typeof accents) in accents
    ? (color as keyof typeof accents)
    : variant;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={twMerge(
        clsx(
          // The accent is a ::before rail that grows on hover, rather than a
          // static border -- it gives the tile something to do on interaction.
          'group relative overflow-hidden rounded-2xl bg-surface p-5 shadow-card border border-line lift',
          'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1',
          'before:transition-all before:duration-200 before:ease-[cubic-bezier(0.22,1,0.36,1)]',
          'hover:before:w-1.5 hover:shadow-premium hover:border-line-strong',
          accents[key],
          onClick && 'cursor-pointer focus-visible:ring-2 focus-visible:ring-gov-600 focus-visible:outline-none',
          className
        )
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">{title}</p>
        {icon && (
          <div
            className={clsx(
              'p-2.5 rounded-xl shrink-0 transition-colors duration-200',
              iconColors[variant]
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <h3 className="text-3xl font-display font-extrabold tracking-tight text-ink tabular-nums">
          {animatedValue}
        </h3>
      </div>

      {(subtitle || change !== undefined) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          {change !== undefined && (
            <span
              className={clsx(
                'inline-flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-lg',
                change > 0
                  ? 'text-emerald-800 bg-emerald-100'
                  : change < 0
                  ? 'text-red-800 bg-red-100'
                  : 'text-sand-700 bg-sand-100'
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
          <span className="text-ink-soft truncate">{subtitle || changeLabel}</span>
        </div>
      )}
    </div>
  );
};
