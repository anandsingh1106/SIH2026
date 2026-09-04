import { describe, it, expect } from 'vitest';
import { toCelsius } from './triageEngine';

describe('toCelsius', () => {
  it('converts the Fahrenheit readings the vitals form collects', () => {
    expect(toCelsius(98.6)).toBe(37);
    expect(toCelsius(100.4)).toBe(38);
    expect(toCelsius(103.5)).toBe(39.7);
  });

  it('converts readings between 32 and 45 instead of passing them through', () => {
    // These used to be mistaken for Celsius, so a normal patient was sent to
    // triage as severely hypothermic.
    expect(toCelsius(93.6)).toBe(34.2);
    expect(toCelsius(97)).toBe(36.1);
    expect(toCelsius(44)).toBe(6.7);
  });

  it('keeps a high fever above the 39.5C urgent threshold', () => {
    expect(toCelsius(103.5)).toBeGreaterThan(39.5);
    expect(toCelsius(100.4)).toBeLessThan(39.5);
  });

  it('returns undefined when no temperature was recorded', () => {
    expect(toCelsius(undefined)).toBeUndefined();
  });
});
