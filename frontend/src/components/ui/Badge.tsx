import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'critical' | 'outline' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full transition-colors duration-200';

  const variants = {
    primary: 'bg-gov-100 text-gov-800 border border-gov-200',
    default: 'bg-sand-100 text-ink border border-line',
    secondary: 'bg-sand-100 text-ink border border-line',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-saffron-100 text-saffron-800 border border-saffron-200',
    danger: 'bg-red-100 text-red-800 border border-red-200',
    critical: 'bg-rose-600 text-white font-bold animate-pulse',
    info: 'bg-sky-100 text-sky-800 border border-sky-200',
    outline: 'border border-line-strong text-ink-muted bg-transparent',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  };

  const dotColors = {
    primary: 'bg-gov-600',
    default: 'bg-sand-500',
    secondary: 'bg-sand-500',
    success: 'bg-emerald-600',
    warning: 'bg-saffron-500',
    danger: 'bg-red-600',
    critical: 'bg-surface',
    info: 'bg-sky-600',
    outline: 'bg-sand-500',
  };

  return (
    <div
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </div>
  );
};
