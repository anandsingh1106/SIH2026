import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: { value: string; label: string; disabled?: boolean }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, children, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-semibold text-ink">
            {label} {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full appearance-none rounded-xl border bg-surface px-4 py-2.5 pr-11 text-base text-ink shadow-subtle transition-all duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-sand-100 disabled:text-ink-soft',
                error
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
                  : 'border-line-strong hover:border-sand-400 focus:border-gov-600 focus:ring-gov-600/15',
                className
              )
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <p className="text-xs text-red-600 font-semibold animate-fade-in">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-ink-soft">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
