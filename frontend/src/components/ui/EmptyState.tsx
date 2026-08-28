import React, { ReactNode } from 'react';
import { Inbox, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-10 text-center bg-raised rounded-2xl border border-dashed border-line-strong my-4 animate-fade-in ${className}`}
    >
      <div className="p-4 bg-saffron-50 text-saffron-500 rounded-2xl mb-4">
        {icon || <Inbox className="w-8 h-8" />}
      </div>
      <h4 className="font-display text-lg font-bold text-ink">{title}</h4>
      <p className="text-sm text-ink-muted max-w-sm mt-1.5 mb-5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 ${className}`}
      role="alert"
    >
      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h5 className="font-semibold text-sm">{title}</h5>
        <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs font-bold underline hover:text-red-900 focus:outline-none"
          >
            Retry Action
          </button>
        )}
      </div>
    </div>
  );
};
