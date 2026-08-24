import React from 'react';
import { clsx } from 'clsx';

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'syncing' | 'error';
  label?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  className,
}) => {
  const configs = {
    online: {
      color: 'bg-emerald-500',
      ping: 'bg-emerald-400',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      defaultLabel: 'Online',
    },
    offline: {
      color: 'bg-slate-500',
      ping: 'bg-slate-400',
      text: 'text-slate-700',
      bg: 'bg-slate-100 border-slate-300',
      defaultLabel: 'Offline Storage Active',
    },
    syncing: {
      color: 'bg-amber-500',
      ping: 'bg-amber-400',
      text: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      defaultLabel: 'Syncing Queue...',
    },
    error: {
      color: 'bg-red-500',
      ping: 'bg-red-400',
      text: 'text-red-700',
      bg: 'bg-red-50 border-red-200',
      defaultLabel: 'Sync Error',
    },
  };

  const current = configs[status];

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border shadow-2xs',
        current.bg,
        current.text,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {status === 'online' || status === 'syncing' ? (
          <span
            className={clsx(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              current.ping
            )}
          />
        ) : null}
        <span className={clsx('relative inline-flex rounded-full h-2 w-2', current.color)} />
      </span>
      <span>{label || current.defaultLabel}</span>
    </div>
  );
};
