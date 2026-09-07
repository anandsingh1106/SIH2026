import React from 'react';

interface PageHeaderProps {
  /** Small line above the title — where the user is, or who they are. */
  eyebrow?: React.ReactNode;
  /** The greeting or page name. Kept short; this is scanned, not read. */
  title: React.ReactNode;
  /** One line of context under the title. */
  subtitle?: React.ReactNode;
  /** Primary actions for the page, right-aligned on desktop. */
  actions?: React.ReactNode;
}

/**
 * The standard header every workspace page opens with.
 *
 * Each dashboard used to carry its own dark gradient banner — teal on ASHA,
 * indigo on specialist, sand on doctor — which made five modules of the same
 * product look like five different products, and spent the page's strongest
 * position on decoration rather than information.
 *
 * This states the same facts on the page's own ground. The stat cards below it
 * become the first coloured thing the eye lands on, which is where the numbers
 * actually are.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, subtitle, actions }) => (
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="min-w-0">
      {eyebrow && (
        <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs font-semibold text-ink-soft">
          {eyebrow}
        </div>
      )}
      <h1 className="font-display text-2xl sm:text-[1.75rem] font-extrabold text-ink tracking-tight leading-tight">
        {title}
      </h1>
      {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
    </div>

    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

/**
 * A section heading inside a card.
 *
 * Sentence case on purpose: the dashboards had grown a habit of shouting every
 * section title in uppercase, which flattens the hierarchy — when everything is
 * emphasised, nothing is.
 */
export const SectionTitle: React.FC<{
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ icon, children, className = '' }) => (
  <h3 className={`font-display text-base font-bold text-ink flex items-center gap-2 ${className}`}>
    {icon}
    {children}
  </h3>
);
