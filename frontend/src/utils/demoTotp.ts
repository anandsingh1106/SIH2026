/**
 * Demo-only TOTP generation, for pre-filling the 2FA code during a walkthrough.
 *
 * SECURITY: every export here is guarded by `import.meta.env.DEV`. In a
 * production build Vite replaces that with `false`, so the secrets below are
 * dropped by dead-code elimination and never reach a deployed bundle. There is
 * no runtime flag to turn this on — it cannot exist outside development.
 *
 * This does not weaken two-factor authentication. The codes are real, computed
 * from the same secrets Supabase holds, and the API verifies them exactly as it
 * verifies a phone's. It only saves reading a number off a terminal.
 */

/**
 * Demo account secrets, filled in by `npm run demo:accounts`.
 *
 * Left empty here on purpose: real values belong in `frontend/.env.local`
 * (gitignored) as VITE_DEMO_TOTP_SECRETS, so no working second factor is ever
 * committed. Without it, auto-fill simply does not appear.
 */
function loadSecrets(): Record<string, string> {
  if (!import.meta.env.DEV) return {};

  const raw = import.meta.env.VITE_DEMO_TOTP_SECRETS;
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

/**
 * RFC 6238 TOTP via WebCrypto.
 *
 * SHA-1 with a 30-second step is not a security choice — it is what
 * authenticator apps implement, so anything else would not interoperate.
 */
async function totp(secret: string, at = Date.now()): Promise<string> {
  const counter = Math.floor(at / 1000 / 30);

  const counterBytes = new ArrayBuffer(8);
  new DataView(counterBytes).setBigInt64(0, BigInt(counter));

  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(secret) as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes));

  // Dynamic truncation, RFC 4226 §5.3.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, '0');
}

/** True when this email has a demo secret available. Always false in production. */
export function isDemoAccount(email: string): boolean {
  if (!import.meta.env.DEV) return false;
  return Boolean(loadSecrets()[email.trim().toLowerCase()]);
}

/**
 * The current code for a demo account, or null when there is no secret for it.
 *
 * Returns null rather than throwing: a failure here should quietly fall back to
 * typing the code by hand, not break the sign-in screen.
 */
export async function demoTotpCode(email: string): Promise<string | null> {
  if (!import.meta.env.DEV) return null;

  const secret = loadSecrets()[email.trim().toLowerCase()];
  if (!secret) return null;

  try {
    return await totp(secret);
  } catch {
    return null;
  }
}

/** Seconds until the current code rolls over, so the UI can refresh in step. */
export function secondsUntilRollover(): number {
  return 30 - Math.floor((Date.now() / 1000) % 30);
}
