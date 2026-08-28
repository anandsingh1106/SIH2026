import React, { useLayoutEffect, useRef, useState } from 'react';
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
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  // The underline glides between tabs rather than jumping, which keeps the
  // relationship between the old and the new tab legible.
  useLayoutEffect(() => {
    if (variant !== 'underline' || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      '[data-tab-id="' + activeTab.replace(/"/g, '\\"') + '"]'
    );
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab, tabs, variant]);

  return (
    <div
      ref={listRef}
      className={twMerge(
        clsx(
          'relative flex gap-1 overflow-x-auto no-scrollbar',
          variant === 'underline' && 'border-b border-line',
          variant === 'pills' && 'bg-sand-100 p-1 rounded-2xl',
          variant === 'enclosed' && 'border-b border-line',
          className
        )
      )}
      role="tablist"
    >
      {variant === 'underline' && indicator.width > 0 && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 h-0.5 bg-gov-700 rounded-full transition-[left,width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}

      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'relative flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap select-none',
              'transition-colors duration-200',
              variant === 'underline' && [
                isActive ? 'text-gov-800' : 'text-ink-soft hover:text-ink',
              ],
              variant === 'pills' && [
                'rounded-xl',
                isActive
                  ? 'bg-surface text-gov-800 shadow-card'
                  : 'text-ink-muted hover:text-ink hover:bg-sand-50',
              ],
              variant === 'enclosed' && [
                'rounded-t-xl border-t border-x -mb-px',
                isActive
                  ? 'bg-surface border-line text-gov-800'
                  : 'border-transparent text-ink-soft hover:text-ink',
              ]
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'px-1.5 py-0.5 text-[11px] rounded-full font-bold tabular-nums transition-colors duration-200',
                  isActive ? 'bg-gov-100 text-gov-800' : 'bg-sand-200 text-sand-700'
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
