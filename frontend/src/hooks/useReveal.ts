import { useEffect, useRef, useState } from 'react';

/**
 * Reveals an element the first time it scrolls into view.
 *
 * Returns a ref to attach and a boolean. The observer disconnects after the
 * first intersection -- content that has been seen should stay visible, not
 * re-animate every time the user scrolls back past it.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(rootMargin = '-60px') {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Without IntersectionObserver, or with motion reduced, show it outright
    // rather than leaving the section permanently blank.
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, visible };
}
