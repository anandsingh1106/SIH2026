import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 up to `value` once, on mount and on every change.
 *
 * Only plain numbers animate. Strings such as "1,240" or "84%" are passed
 * straight through -- parsing them back into numbers would have to guess at
 * locale separators and unit suffixes, and getting that wrong on a clinical
 * figure is worse than not animating it.
 */
export function useCountUp(value: number | string, durationMs = 900): number | string {
  const isNumeric = typeof value === 'number' && Number.isFinite(value);
  const [display, setDisplay] = useState<number>(isNumeric ? 0 : 0);
  const frame = useRef<number>();

  useEffect(() => {
    if (!isNumeric) return;

    const target = value as number;

    // Respect the user's motion preference: jump straight to the figure.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target);
      return;
    }

    const start = performance.now();
    // Ease-out cubic: fast first, settling gently on the final figure.
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const current = target * ease(t);
      // Integers count in integers; decimals keep one place.
      setDisplay(Number.isInteger(target) ? Math.round(current) : Number(current.toFixed(1)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs, isNumeric]);

  return isNumeric ? display : value;
}
