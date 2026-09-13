import crypto from 'crypto';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { ExternalServiceError } from '../../utils/errors.js';

/**
 * Client for the ABDM (Ayushman Bharat Digital Mission) ABHA V3 APIs.
 *
 * STATUS: written against the published V3 contract, NOT yet exercised against
 * ABDM. Reaching these endpoints requires client credentials issued by the
 * National Health Authority after sandbox registration and M1 certification,
 * which this deployment has not completed. Until ABDM_CLIENT_ID and
 * ABDM_CLIENT_SECRET are set, `isConfigured()` is false and every call throws
 * rather than pretending — a health identifier must never appear verified when
 * nothing verified it.
 *
 * Base URLs and the session/certificate/enrolment shapes follow the ABDM ABHA
 * V3 Integrator Guide (sandbox.abdm.gov.in). Expect to re-check them against
 * the current guide when credentials arrive; NHA revises these.
 */

const SANDBOX = {
  abha: 'https://abhasbx.abdm.gov.in/abha/api/v3',
  gateway: 'https://dev.abdm.gov.in/api/hiecm/gateway/v3',
};

const PRODUCTION = {
  abha: 'https://abha.abdm.gov.in/api/v3',
  gateway: 'https://abhasm.abdm.gov.in/api/hiecm/gateway/v3',
};

function baseUrls() {
  return env.ABDM_ENV === 'production' ? PRODUCTION : SANDBOX;
}

export function isConfigured() {
  return Boolean(env.ABDM_CLIENT_ID && env.ABDM_CLIENT_SECRET);
}

function requireConfigured() {
  if (isConfigured()) return;
  throw new ExternalServiceError(
    'ABHA verification is not available: this deployment has no ABDM credentials. ' +
      'ABHA identifiers are recorded as entered and remain unverified.'
  );
}

/** Headers ABDM requires on every call: a fresh request id and a timestamp. */
function baseHeaders() {
  return {
    'Content-Type': 'application/json',
    'REQUEST-ID': crypto.randomUUID(),
    TIMESTAMP: new Date().toISOString(),
  };
}

// The session token is short-lived; caching it avoids a round trip per call.
let cachedSession = null;

/**
 * Exchanges the client credentials for a gateway access token.
 * POST /sessions  { clientId, clientSecret, grantType: 'client_credentials' }
 */
export async function getAccessToken() {
  requireConfigured();

  if (cachedSession && cachedSession.expiresAt > Date.now() + 30_000) {
    return cachedSession.token;
  }

  const res = await fetch(`${baseUrls().gateway}/sessions`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({
      clientId: env.ABDM_CLIENT_ID,
      clientSecret: env.ABDM_CLIENT_SECRET,
      grantType: 'client_credentials',
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error('ABDM session request failed', { status: res.status });
    throw new ExternalServiceError(`ABDM session request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.accessToken) {
    throw new ExternalServiceError('ABDM session response contained no accessToken.');
  }

  // expiresIn is seconds when present; fall back to a conservative 10 minutes.
  const ttlMs = (Number(data.expiresIn) || 600) * 1000;
  cachedSession = { token: data.accessToken, expiresAt: Date.now() + ttlMs };

  return data.accessToken;
}

/**
 * Fetches ABDM's RSA public certificate. Aadhaar numbers, mobile numbers and
 * OTPs must be encrypted with this before they are sent — ABDM rejects them in
 * plain text, and rightly so.
 */
export async function getPublicCertificate() {
  requireConfigured();

  const token = await getAccessToken();
  const res = await fetch(`${baseUrls().abha}/profile/public/certificate`, {
    method: 'GET',
    headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new ExternalServiceError(`ABDM certificate request failed (${res.status}).`);
  }

  const data = await res.json();
  if (!data.publicKey) {
    throw new ExternalServiceError('ABDM certificate response contained no publicKey.');
  }
  return data.publicKey;
}

/**
 * RSA-encrypts a value with ABDM's public key, as the V3 APIs require for
 * every piece of sensitive input.
 */
export function encryptWithPublicKey(value, publicKeyPem) {
  const key = publicKeyPem.includes('BEGIN PUBLIC KEY')
    ? publicKeyPem
    : `-----BEGIN PUBLIC KEY-----\n${publicKeyPem}\n-----END PUBLIC KEY-----`;

  return crypto
    .publicEncrypt(
      { key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha1' },
      Buffer.from(String(value), 'utf8')
    )
    .toString('base64');
}

/**
 * Step 1 of ABHA verification: ask ABDM to send an OTP to the mobile number
 * registered against an existing ABHA. Returns a txnId for step 2.
 *
 * POST /profile/login/request/otp
 */
export async function requestLoginOtp({ abhaIdentifier, scope = 'abha-address' }) {
  requireConfigured();

  const token = await getAccessToken();
  const publicKey = await getPublicCertificate();

  const res = await fetch(`${baseUrls().abha}/profile/login/request/otp`, {
    method: 'POST',
    headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      scope: [scope, 'mobile-verify'],
      loginHint: scope,
      loginId: encryptWithPublicKey(abhaIdentifier, publicKey),
      otpSystem: 'abdm',
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ExternalServiceError(`ABDM OTP request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return { txnId: data.txnId, message: data.message };
}

/**
 * Step 2: submit the OTP against the txnId from step 1. A success returns
 * ABDM's own token plus the verified profile.
 *
 * POST /profile/login/verify
 */
export async function verifyLoginOtp({ txnId, otp }) {
  requireConfigured();

  const token = await getAccessToken();
  const publicKey = await getPublicCertificate();

  const res = await fetch(`${baseUrls().abha}/profile/login/verify`, {
    method: 'POST',
    headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      scope: ['abha-address', 'mobile-verify'],
      authData: {
        authMethods: ['otp'],
        otp: { txnId, otpValue: encryptWithPublicKey(otp, publicKey) },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ExternalServiceError(`ABDM OTP verification failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    token: data.token,
    abhaNumber: data.ABHANumber ?? data.abhaNumber,
    abhaAddress: data.preferredAbhaAddress ?? data.abhaAddress,
    name: data.name,
  };
}

/** Clears the cached session. Exported for tests. */
export function resetSessionCache() {
  cachedSession = null;
}
