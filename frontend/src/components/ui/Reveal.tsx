import React from 'react';
import { clsx } from 'clsx';
import { useReveal } from '../../hooks/useReveal';

export interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in ms before the reveal starts, for cascading sibling sections. */
  delay?: number;
  as?: 'div' | 'section';
}

/**
 * Fades and lifts its children into view on first scroll. Purely decorative --
 * the content is in the DOM and readable throughout, so a failed observer or
 * a reduced-motion preference costs nothing.
 */
export const Reveal: React.FC<RevealProps> = ({ children, className, delay = 0, as = 'div' }) => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const Tag = as;

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
      className={clsx(
        'transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
    >
      {children}
    </Tag>
  );
};
