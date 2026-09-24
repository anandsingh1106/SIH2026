import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * ICE servers for video consultations.
 *
 * STUN lets two browsers find each other when at least one side can accept a
 * direct connection. Mobile data (carrier NAT) and many office networks cannot,
 * so a TURN relay is needed for the call to connect at all. TURN credentials are
 * secret, so they are handed out here, to signed-in users only, instead of being
 * built into the frontend.
 *
 * Two ways to configure a relay:
 * - Cloudflare Realtime TURN: TURN_CLOUDFLARE_KEY_ID and TURN_CLOUDFLARE_API_TOKEN.
 *   Short-lived credentials are generated per request batch and cached.
 * - Any other TURN server: TURN_URLS (comma separated), TURN_USERNAME and
 *   TURN_CREDENTIAL.
 * With neither, calls fall back to STUN only.
 */

const STUN = { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] };

// Credentials live a day; they are reused for half of that, so a call that
// starts just before a refresh still has hours left.
const CLOUDFLARE_TTL_SECONDS = 24 * 60 * 60;
const CACHE_MS = (CLOUDFLARE_TTL_SECONDS / 2) * 1000;

let cached = null;

/** Accepts both the current array reply and the older single-object reply. */
function normaliseCloudflare(body) {
  const list = Array.isArray(body?.iceServers) ? body.iceServers : body?.iceServers ? [body.iceServers] : [];
  return list.filter((s) => s && s.urls);
}

async function cloudflareServers() {
  if (cached && cached.expiresAt > Date.now()) return cached.servers;

  const url = `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_CLOUDFLARE_KEY_ID}/credentials/generate-ice-servers`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.TURN_CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ttl: CLOUDFLARE_TTL_SECONDS }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Cloudflare TURN returned ${res.status}`);

  const servers = normaliseCloudflare(await res.json());
  if (!servers.length) throw new Error('Cloudflare TURN returned no servers');
  cached = { servers, expiresAt: Date.now() + CACHE_MS };
  return servers;
}

function staticServers() {
  const urls = env.TURN_URLS.split(',').map((u) => u.trim()).filter(Boolean);
  return urls.length ? [{ urls, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL }] : [];
}

/**
 * Never throws: a relay that cannot be reached must not stop a call that
 * might still connect directly.
 */
export async function getIceServers() {
  if (env.TURN_CLOUDFLARE_KEY_ID && env.TURN_CLOUDFLARE_API_TOKEN) {
    try {
      return { iceServers: [STUN, ...(await cloudflareServers())], relay: true };
    } catch (err) {
      logger.warn('TURN credentials unavailable, video calls fall back to STUN', { error: err.message });
      return { iceServers: [STUN], relay: false };
    }
  }

  if (env.TURN_URLS && env.TURN_USERNAME && env.TURN_CREDENTIAL) {
    return { iceServers: [STUN, ...staticServers()], relay: true };
  }

  return { iceServers: [STUN], relay: false };
}

/** Lets tests start from an empty credential cache. */
export function resetIceServerCache() {
  cached = null;
}
