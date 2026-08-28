import React, { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-ink">
            {label} {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-ink-soft pointer-events-none flex items-center transition-colors">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full rounded-xl border bg-surface px-4 py-2.5 text-base text-ink placeholder:text-ink-soft/70 shadow-subtle transition-all duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-sand-100 disabled:text-ink-soft',
                leftIcon ? 'pl-11' : 'pl-4',
                rightIcon ? 'pr-11' : 'pr-4',
                error
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
                  : 'border-line-strong hover:border-sand-400 focus:border-gov-600 focus:ring-gov-600/15',
                className
              )
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-ink-soft flex items-center">{rightIcon}</div>
          )}
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

Input.displayName = 'Input';
