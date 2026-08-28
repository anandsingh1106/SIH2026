import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (title: string, options?: { message?: string; type?: ToastType; durationMs?: number }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (
    title: string,
    options?: { message?: string; type?: ToastType; durationMs?: number }
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = {
      id,
      title,
      message: options?.message,
      type: options?.type || 'info',
    };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, options?.durationMs || 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (title: string, message?: string) => addToast(title, { message, type: 'success' });
  const error = (title: string, message?: string) => addToast(title, { message, type: 'error' });
  const warning = (title: string, message?: string) => addToast(title, { message, type: 'warning' });
  const info = (title: string, message?: string) => addToast(title, { message, type: 'info' });

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-saffron-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
  };

  const borderAccents = {
    success: 'border-l-4 border-l-emerald-500 bg-surface',
    warning: 'border-l-4 border-l-saffron-500 bg-surface',
    error: 'border-l-4 border-l-red-500 bg-surface',
    info: 'border-l-4 border-l-sky-500 bg-surface',
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info }}>
      {children}
      <div className="fixed z-[60] flex flex-col gap-2 pointer-events-none p-3 inset-x-0 top-0 sm:inset-x-auto sm:top-auto sm:bottom-4 sm:right-4 sm:max-w-sm sm:w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-premium border border-line ${borderAccents[t.type]} animate-fade-up`}
            role={t.type === 'error' ? 'alert' : 'status'}
            aria-live={t.type === 'error' ? 'assertive' : 'polite'}
          >
            {icons[t.type]}
            <div className="flex-1">
              <h5 className="font-bold text-sm text-ink">{t.title}</h5>
              {t.message && <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-ink-soft hover:text-ink p-1 rounded-lg hover:bg-sand-100 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
