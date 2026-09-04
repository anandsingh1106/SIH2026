import { describe, expect, it } from 'vitest';
import { formatCrore } from './formatIndianNumber';

describe('formatCrore', () => {
  it('renders crore-scale figures in crore', () => {
    expect(formatCrore(71_000_000)).toBe('7.1 Cr');
  });

  it('renders lakh-scale figures in lakh', () => {
    expect(formatCrore(4_780_259)).toBe('47.8 L');
  });

  it('falls back to Indian digit grouping below a lakh', () => {
    // Indian grouping, not the western 12,858 -> same here but 1,69,615 differs.
    expect(formatCrore(12_858)).toBe('12,858');
    expect(formatCrore(99_999)).toBe('99,999');
  });

  it('drops a trailing .0 but keeps a meaningful decimal', () => {
    expect(formatCrore(10_000_000)).toBe('1 Cr');
    expect(formatCrore(15_000_000)).toBe('1.5 Cr');
  });

  it('switches unit exactly at the lakh and crore boundaries', () => {
    expect(formatCrore(99_999)).toBe('99,999');
    expect(formatCrore(100_000)).toBe('1 L');
    expect(formatCrore(9_999_999)).toBe('100 L');
    expect(formatCrore(10_000_000)).toBe('1 Cr');
  });

  it('keeps the sign on negative values', () => {
    expect(formatCrore(-4_780_259)).toBe('-47.8 L');
  });

  it('returns a dash rather than NaN for non-finite input', () => {
    expect(formatCrore(Number.NaN)).toBe('—');
    expect(formatCrore(Number.POSITIVE_INFINITY)).toBe('—');
  });
});
