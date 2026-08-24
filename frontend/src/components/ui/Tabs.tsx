import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'underline' | 'pills' | 'enclosed';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  variant = 'underline',
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'flex gap-1 overflow-x-auto no-scrollbar',
          variant === 'underline' && 'border-b border-slate-200',
          variant === 'pills' && 'bg-slate-100 p-1 rounded-xl',
          variant === 'enclosed' && 'border-b border-slate-200',
          className
        )
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all select-none',
              variant === 'underline' && [
                isActive
                  ? 'border-b-2 border-gov-700 text-gov-800 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:border-b-2 hover:border-slate-300',
              ],
              variant === 'pills' && [
                'rounded-lg',
                isActive
                  ? 'bg-white text-gov-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900',
              ],
              variant === 'enclosed' && [
                'rounded-t-lg border-t border-x -mb-px',
                isActive
                  ? 'bg-white border-slate-200 text-gov-800 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800',
              ]
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'px-1.5 py-0.5 text-[11px] rounded-full font-bold',
                  isActive
                    ? 'bg-gov-100 text-gov-800'
                    : 'bg-slate-200 text-slate-700'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
