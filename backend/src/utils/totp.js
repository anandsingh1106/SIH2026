import crypto from 'crypto';

/**
 * RFC 6238 TOTP, used only by the demo-account tooling.
 *
 * Production 2FA never comes through here: Supabase owns real enrolment and
 * verification, and the API re-checks the resulting assurance level. This
 * exists so the seeding script can hold a factor's secret and print a valid
 * code during a demo, and so tests can prove a generated secret really works.
 */

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Base32 (RFC 4648, no padding) — the encoding authenticator apps expect. */
export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];

  return output;
}

export function base32Decode(input) {
  const clean = String(input).toUpperCase().replace(/[=\s-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/** A random TOTP secret. 20 bytes is the RFC 4226 recommendation for SHA-1. */
export function generateSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

/**
 * The 6-digit code for a given moment.
 *
 * SHA-1 with a 30-second step is not a security choice here — it is what
 * authenticator apps implement, so anything else would not interoperate.
 */
export function generateTotp(secret, { at = Date.now(), step = 30, digits = 6 } = {}) {
  const counter = Math.floor(at / 1000 / step);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest();

  // Dynamic truncation, RFC 4226 §5.3.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
}

/**
 * Checks a code, allowing one step either side for clock drift.
 *
 * Comparison is constant-time so a timing signal cannot leak digits.
 */
export function verifyTotp(secret, token, { at = Date.now(), step = 30, window = 1 } = {}) {
  const candidate = String(token).replace(/\s/g, '');
  if (!/^\d{6}$/.test(candidate)) return false;

  for (let drift = -window; drift <= window; drift++) {
    const expected = generateTotp(secret, { at: at + drift * step * 1000, step });
    const a = Buffer.from(expected);
    const b = Buffer.from(candidate);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }

  return false;
}

/** otpauth:// URI, the payload an authenticator QR code encodes. */
export function buildOtpAuthUri({ secret, label, issuer = 'ArogyaSetu' }) {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params}`;
}
