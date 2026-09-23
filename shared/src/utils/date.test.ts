import { describe, it, expect, vi, afterEach } from 'vitest';
import { localDateString, localDateOffset } from './date';

describe('localDateString', () => {
  afterEach(() => vi.useRealTimers());

  it('formats the local calendar date, not the UTC one', () => {
    // 00:30 local time: in any timezone east of UTC the UTC date is still yesterday.
    const lateNight = new Date(2026, 8, 24, 0, 30);
    expect(localDateString(lateNight)).toBe('2026-09-24');
  });

  it('pads single-digit months and days', () => {
    expect(localDateString(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });

  it('offsets from today across a month boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 29, 9));
    expect(localDateOffset(3)).toBe('2026-10-02');
    expect(localDateOffset(-30)).toBe('2026-08-30');
  });
});
