/**
 * Demo-only TOTP generation, for pre-filling the 2FA code during a
 * walkthrough. Mirrors frontend/src/utils/demoTotp.ts, but implements
 * HMAC-SHA1 in pure JS instead of using WebCrypto's `crypto.subtle` — React
 * Native's JS engine has no such API, and expo-crypto does not expose HMAC.
 *
 * SECURITY: every export here is guarded by `__DEV__`, which Metro strips to
 * `false` in a release build, so the secrets below are dead-code-eliminated
 * and never reach a built app. There is no runtime flag to turn this on — it
 * cannot exist outside development.
 *
 * This does not weaken two-factor authentication. The codes are real,
 * computed from the same secrets Supabase holds, and the API verifies them
 * exactly as it verifies a phone's. It only saves reading a number off a
 * terminal.
 */

/**
 * Demo account secrets, filled in by `npm run demo:accounts`.
 *
 * Left empty here on purpose: real values belong in `mobile/.env.local`
 * (gitignored) as EXPO_PUBLIC_DEMO_TOTP_SECRETS, so no working second factor
 * is ever committed. Without it, auto-fill simply does not appear.
 */
function loadSecrets(): Record<string, string> {
  if (!__DEV__) return {};

  const raw = process.env.EXPO_PUBLIC_DEMO_TOTP_SECRETS;
  if (!raw) return {};

  try {
    // Format: email:SECRET,email:SECRET
    return Object.fromEntries(
      String(raw)
        .split(',')
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
          const index = pair.lastIndexOf(':');
          return [pair.slice(0, index).trim().toLowerCase(), pair.slice(index + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[=\s-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error('invalid base32');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

// --- Pure-JS SHA-1, only used as the HMAC hash function below. -------------

function sha1(message: Uint8Array): Uint8Array {
  const msgLen = message.length;
  const wordCount = (((msgLen + 8) >> 6) + 1) * 16;
  const words = new Uint32Array(wordCount);

  for (let i = 0; i < msgLen; i++) {
    words[i >> 2] |= message[i] << (24 - (i % 4) * 8);
  }
  words[msgLen >> 2] |= 0x80 << (24 - (msgLen % 4) * 8);
  words[wordCount - 1] = msgLen * 8;

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);

  for (let block = 0; block < wordCount; block += 16) {
    for (let i = 0; i < 16; i++) w[i] = words[block + i];
    for (let i = 16; i < 80; i++) {
      const v = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = (v << 1) | (v >>> 31);
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4;

    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const out = new Uint8Array(20);
  [h0, h1, h2, h3, h4].forEach((h, i) => {
    out[i * 4] = (h >>> 24) & 0xff;
    out[i * 4 + 1] = (h >>> 16) & 0xff;
    out[i * 4 + 2] = (h >>> 8) & 0xff;
    out[i * 4 + 3] = h & 0xff;
  });
  return out;
}

function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let keyBlock = key.length > blockSize ? sha1(key) : key;
  if (keyBlock.length < blockSize) {
    const padded = new Uint8Array(blockSize);
    padded.set(keyBlock);
    keyBlock = padded;
  }

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = keyBlock[i] ^ 0x5c;
    iKeyPad[i] = keyBlock[i] ^ 0x36;
  }

  const inner = sha1(new Uint8Array([...iKeyPad, ...message]));
  return sha1(new Uint8Array([...oKeyPad, ...inner]));
}

/**
 * RFC 6238 TOTP. SHA-1 with a 30-second step is not a security choice — it
 * is what authenticator apps implement, so anything else would not
 * interoperate.
 */
function totp(secret: string, at = Date.now()): string {
  const counter = Math.floor(at / 1000 / 30);

  const counterBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }

  const digest = hmacSha1(base32Decode(secret), counterBytes);

  // Dynamic truncation, RFC 4226 §5.3.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, '0');
}

/** True when this email has a demo secret available. Always false in a release build. */
export function isDemoAccount(email: string): boolean {
  if (!__DEV__) return false;
  return Boolean(loadSecrets()[email.trim().toLowerCase()]);
}

/**
 * The current code for a demo account, or null when there is no secret for it.
 *
 * Returns null rather than throwing: a failure here should quietly fall back
 * to typing the code by hand, not break the sign-in screen.
 */
export function demoTotpCode(email: string): string | null {
  if (!__DEV__) return null;

  const secret = loadSecrets()[email.trim().toLowerCase()];
  if (!secret) return null;

  try {
    return totp(secret);
  } catch {
    return null;
  }
}

/** Seconds until the current code rolls over, so the UI can refresh in step. */
export function secondsUntilRollover(): number {
  return 30 - Math.floor((Date.now() / 1000) % 30);
}
