import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  position?: 'left' | 'right';
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  position = 'right',
  children,
  footer,
  width = 'md',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widths = {
    sm: 'max-w-xs',
    md: 'max-w-md',
    lg: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="fixed inset-0 bg-sand-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={twMerge(
          clsx(
            'fixed inset-y-0 flex max-w-full bg-surface shadow-premium z-10 animate-slide-in-right',
            position === 'right' ? 'right-0' : 'left-0 [animation-name:fade-in]'
          )
        )}
      >
        <div className={twMerge(clsx('w-screen flex flex-col', widths[width]))}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-line bg-raised">
            <h3 className="font-display font-bold text-ink">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-ink-soft hover:text-ink hover:bg-sand-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto flex-1">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="p-4 bg-raised border-t border-line flex justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
