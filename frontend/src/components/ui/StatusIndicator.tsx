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
      color: 'bg-sand-500',
      ping: 'bg-sand-400',
      text: 'text-ink-muted',
      bg: 'bg-sand-100 border-line-strong',
      defaultLabel: 'Offline Storage Active',
    },
    syncing: {
      color: 'bg-saffron-500',
      ping: 'bg-saffron-400',
      text: 'text-saffron-800',
      bg: 'bg-saffron-50 border-saffron-200',
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
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-subtle transition-colors',
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
