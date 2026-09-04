/**
 * Indian-numbering helpers.
 *
 * Statewide figures run into crores, and a raw "71,000,000" is both hard to
 * scan and grouped the wrong way for an Indian audience — the lakh/crore system
 * groups the last three digits, then in pairs.
 */

const CRORE = 10_000_000;
const LAKH = 100_000;

/** Drops a trailing ".0" so 71.0 reads as 71 but 47.8 keeps its decimal. */
const trim = (n: number): string => n.toFixed(1).replace(/\.0$/, '');

/**
 * Formats a number in crore/lakh, falling back to Indian digit grouping below
 * a lakh. Negative inputs keep their sign.
 *
 *   formatCrore(71_000_000) === '7.1 Cr'
 *   formatCrore(4_780_259)  === '47.8 L'
 *   formatCrore(12_858)     === '12,858'
 */
export function formatCrore(value: number): string {
  if (!Number.isFinite(value)) return '—';

  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs >= CRORE) return `${sign}${trim(abs / CRORE)} Cr`;
  if (abs >= LAKH) return `${sign}${trim(abs / LAKH)} L`;
  return value.toLocaleString('en-IN');
}
