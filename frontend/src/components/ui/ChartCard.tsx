import React, { ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl border border-line bg-surface p-5 shadow-card lift hover:shadow-elevated flex flex-col',
          className
        )
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-line">
        <div>
          <h4 className="font-display font-bold text-ink text-base">{title}</h4>
          {subtitle && <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      <div className="w-full flex-1 min-h-[260px]">{children}</div>
    </div>
  );
};
