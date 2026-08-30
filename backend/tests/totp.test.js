import { describe, it, expect } from 'vitest';
import {
  base32Encode, base32Decode, generateSecret, generateTotp, verifyTotp, buildOtpAuthUri,
} from '../src/utils/totp.js';

/**
 * The RFC 6238 vectors are the point of this suite. A TOTP implementation that
 * is merely self-consistent is worthless — it has to agree with what Google
 * Authenticator and Authy compute, or the demo accounts cannot be signed into.
 */
describe('RFC 6238 test vectors', () => {
  // Appendix B: the ASCII secret "12345678901234567890", SHA-1.
  const SECRET = base32Encode(Buffer.from('12345678901234567890'));

  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('matches the published code at t=%i', (unixSeconds, expected) => {
    expect(generateTotp(SECRET, { at: unixSeconds * 1000 })).toBe(expected);
  });
});

describe('base32', () => {
  it.each([
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foobar', 'MZXW6YTBOI'],
  ])('encodes %o per RFC 4648', (input, expected) => {
    expect(base32Encode(Buffer.from(input))).toBe(expected);
  });

  it('round-trips arbitrary bytes', () => {
    const original = Buffer.from([0x00, 0xff, 0x7f, 0x80, 0x01, 0xfe, 0x42]);
    expect(base32Decode(base32Encode(original))).toEqual(original);
  });

  it('tolerates the spacing and case a user might type', () => {
    const secret = generateSecret();
    const messy = secret.toLowerCase().replace(/(.{4})/g, '$1 ');
    expect(base32Decode(messy)).toEqual(base32Decode(secret));
  });

  it('rejects a character outside the alphabet', () => {
    // '1' and '0' are excluded by RFC 4648 to avoid confusion with I and O.
    expect(() => base32Decode('ABC1')).toThrow(/Invalid base32/);
  });
});

describe('generateSecret', () => {
  it('produces a 32-character secret by default', () => {
    // 20 bytes is the RFC 4226 recommendation for SHA-1.
    expect(generateSecret()).toHaveLength(32);
  });

  it('produces a different secret every time', () => {
    const secrets = new Set(Array.from({ length: 50 }, () => generateSecret()));
    expect(secrets.size).toBe(50);
  });

  it('produces something a decoder accepts', () => {
    expect(base32Decode(generateSecret())).toHaveLength(20);
  });
});

describe('generateTotp', () => {
  it('returns six digits', () => {
    expect(generateTotp(generateSecret())).toMatch(/^\d{6}$/);
  });

  it('holds steady within a 30-second step and changes across one', () => {
    const secret = generateSecret();
    // 0s and 29s fall in the same step; 30s is the next one.
    const base = 1_700_000_000_000 - (1_700_000_000_000 % 30_000);

    expect(generateTotp(secret, { at: base })).toBe(generateTotp(secret, { at: base + 29_000 }));
    expect(generateTotp(secret, { at: base })).not.toBe(generateTotp(secret, { at: base + 30_000 }));
  });

  it('gives different codes for different secrets', () => {
    const at = Date.now();
    expect(generateTotp(generateSecret(), { at })).not.toBe(generateTotp(generateSecret(), { at }));
  });

  it('pads a short code to six digits', () => {
    // Codes below 100000 must keep their leading zeros, or they are rejected.
    const codes = Array.from({ length: 200 }, (_, i) =>
      generateTotp(generateSecret(), { at: i * 30_000 })
    );
    for (const code of codes) expect(code).toHaveLength(6);
  });
});

describe('verifyTotp', () => {
  it('accepts the current code', () => {
    const secret = generateSecret();
    expect(verifyTotp(secret, generateTotp(secret))).toBe(true);
  });

  it('accepts a code one step old, for clock drift', () => {
    const secret = generateSecret();
    const at = Date.now();
    // A user typing a code as it rolls over must not be rejected.
    expect(verifyTotp(secret, generateTotp(secret, { at: at - 30_000 }), { at })).toBe(true);
  });

  it('rejects a code two steps old', () => {
    const secret = generateSecret();
    const at = Date.now();
    expect(verifyTotp(secret, generateTotp(secret, { at: at - 90_000 }), { at })).toBe(false);
  });

  it('rejects a code from a different secret', () => {
    const at = Date.now();
    expect(verifyTotp(generateSecret(), generateTotp(generateSecret(), { at }), { at })).toBe(false);
  });

  it.each(['', '12345', '1234567', 'abcdef', '12 34 56', null, undefined])(
    'rejects malformed input %o without throwing',
    (input) => {
      expect(verifyTotp(generateSecret(), input)).toBe(false);
    }
  );

  it('tolerates whitespace in an otherwise valid code', () => {
    const secret = generateSecret();
    const code = generateTotp(secret);
    expect(verifyTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`)).toBe(true);
  });
});

describe('buildOtpAuthUri', () => {
  it('produces a URI an authenticator app understands', () => {
    const uri = buildOtpAuthUri({ secret: 'JBSWY3DPEHPK3PXP', label: 'doctor001@arogyasetu.test' });

    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).toContain('issuer=ArogyaSetu');
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('period=30');
  });

  it('escapes a label containing characters that would break the URI', () => {
    const uri = buildOtpAuthUri({ secret: 'JBSWY3DPEHPK3PXP', label: 'a b/c@test' });
    expect(uri).not.toMatch(/totp\/[^?]*[ ]/);
    expect(uri).toContain('a%20b%2Fc%40test');
  });
});
