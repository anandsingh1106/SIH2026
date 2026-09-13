import { describe, it, expect } from 'vitest';
import {
  validateAbhaNumber,
  validateAbhaAddress,
  validateAbhaIdentifier,
  formatAbhaNumber,
  maskAbhaNumber,
} from './abha';

describe('validateAbhaNumber', () => {
  it('accepts 14 plain digits', () => {
    const result = validateAbhaNumber('12345678901234');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('12345678901234');
  });

  it.each([
    ['12 3456 7890 1234', 'spaces as printed on the card'],
    ['12-3456-7890-1234', 'hyphens'],
    ['  12345678901234  ', 'surrounding whitespace'],
  ])('accepts %s (%s)', (input) => {
    const result = validateAbhaNumber(input);
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('12345678901234');
  });

  it.each([
    ['1234567890123', 'one digit short'],
    ['123456789012345', 'one digit long'],
    ['', 'empty'],
    ['   ', 'whitespace only'],
  ])('rejects %s (%s)', (input) => {
    expect(validateAbhaNumber(input).valid).toBe(false);
  });

  it('rejects letters', () => {
    const result = validateAbhaNumber('1234567890123A');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/only digits/i);
  });

  it('rejects a non-string', () => {
    expect(validateAbhaNumber(12345678901234).valid).toBe(false);
    expect(validateAbhaNumber(null).valid).toBe(false);
    expect(validateAbhaNumber(undefined).valid).toBe(false);
  });

  it('reports the length actually entered, so the user can see the mistake', () => {
    expect(validateAbhaNumber('123').error).toContain('you entered 3');
  });

  it('does not apply a checksum: any 14 digits are structurally valid', () => {
    // Deliberate. ABDM does not publish a check digit for the ABHA number, so
    // inventing one would reject real patients' real numbers.
    expect(validateAbhaNumber('00000000000000').valid).toBe(true);
    expect(validateAbhaNumber('99999999999999').valid).toBe(true);
  });
});

describe('validateAbhaAddress', () => {
  it.each([
    'ramesh.patil@abdm',
    'ramesh_patil@abdm',
    'ramesh-patil@abdm',
    'user123@abdm',
  ])('accepts %s', (input) => {
    expect(validateAbhaAddress(input).valid).toBe(true);
  });

  it('lowercases and trims', () => {
    const result = validateAbhaAddress('  Ramesh.Patil@ABDM  ');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('ramesh.patil@abdm');
  });

  it.each([
    ['abdm', 'no @ at all'],
    ['@abdm', 'empty local part'],
    ['abc@', 'empty suffix'],
    ['ab@abdm', 'local part shorter than four characters'],
    ['.ramesh@abdm', 'leading dot'],
    ['ramesh.@abdm', 'trailing dot'],
    ['ram esh@abdm', 'space inside'],
    ['', 'empty'],
  ])('rejects %s (%s)', (input) => {
    expect(validateAbhaAddress(input).valid).toBe(false);
  });

  it('accepts a suffix other than abdm, since more may be issued', () => {
    expect(validateAbhaAddress('ramesh.patil@sbx').valid).toBe(true);
  });
});

describe('validateAbhaIdentifier', () => {
  it('routes an @ to the address validator', () => {
    expect(validateAbhaIdentifier('ramesh.patil@abdm').valid).toBe(true);
    expect(validateAbhaIdentifier('ab@abdm').valid).toBe(false);
  });

  it('routes digits to the number validator', () => {
    expect(validateAbhaIdentifier('12 3456 7890 1234').valid).toBe(true);
    expect(validateAbhaIdentifier('123').valid).toBe(false);
  });
});

describe('formatAbhaNumber', () => {
  it('groups 14 digits as 2-4-4-4', () => {
    expect(formatAbhaNumber('12345678901234')).toBe('12 3456 7890 1234');
  });

  it('is idempotent on already-formatted input', () => {
    expect(formatAbhaNumber('12 3456 7890 1234')).toBe('12 3456 7890 1234');
  });

  it('returns the input unchanged when it is not 14 digits', () => {
    expect(formatAbhaNumber('123')).toBe('123');
  });
});

describe('maskAbhaNumber', () => {
  it('reveals only the last four digits', () => {
    expect(maskAbhaNumber('12345678901234')).toBe('•• •••• •••• 1234');
  });

  it('masks entirely when the input is not a full ABHA number', () => {
    expect(maskAbhaNumber('123')).toBe('••••');
  });
});
