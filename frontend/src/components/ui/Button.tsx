import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'amber' | 'saffron';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'group relative inline-flex items-center justify-center whitespace-nowrap font-semibold rounded-xl select-none ' +
      'transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ' +
      'disabled:opacity-55 disabled:pointer-events-none ' +
      'hover:-translate-y-px active:translate-y-0 active:scale-[0.985]';

    const variants = {
      primary:
        'bg-gov-700 hover:bg-gov-800 text-white focus-visible:ring-gov-600 shadow-soft hover:shadow-glow',
      saffron:
        'bg-saffron-700 hover:bg-saffron-800 text-white focus-visible:ring-saffron-600 shadow-soft hover:shadow-glow-saffron',
      secondary:
        'bg-sand-100 hover:bg-sand-200 text-ink focus-visible:ring-sand-400 border border-line hover:border-sand-300',
      outline:
        'border-[1.5px] border-gov-600 text-gov-700 hover:bg-gov-50 hover:border-gov-700 focus-visible:ring-gov-600 bg-transparent',
      ghost:
        'text-sand-700 hover:text-ink hover:bg-sand-100 focus-visible:ring-sand-400',
      danger:
        'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500 shadow-soft',
      success:
        'bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500 shadow-soft',
      amber:
        'bg-saffron-700 hover:bg-saffron-800 text-white focus-visible:ring-saffron-600 shadow-soft hover:shadow-glow-saffron',
    };

    // Generous heights: these are tapped one-handed, often outdoors.
    const sizes = {
      sm: 'h-9 px-3.5 text-xs gap-1.5',
      md: 'h-11 px-5 text-sm gap-2',
      lg: 'h-13 px-7 text-base gap-2.5',
      icon: 'h-11 w-11 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : leftIcon ? (
          <span className="shrink-0 transition-transform duration-200 group-hover:-translate-x-px">
            {leftIcon}
          </span>
        ) : null}
        {children}
        {!isLoading && rightIcon && (
          <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
