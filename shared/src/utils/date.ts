/**
 * The calendar date on the device, as YYYY-MM-DD.
 *
 * `toISOString()` gives the UTC date, which in India is still the previous
 * day until 05:30, so "today" defaults and due-today checks were off by one.
 */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The local calendar date `days` from today (negative for the past). */
export function localDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateString(d);
}
