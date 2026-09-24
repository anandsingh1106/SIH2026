import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { resetIceServerCache } from '../src/services/iceServerService.js';
import { resetTestDb, createUser, authCookie, request } from './helpers.js';

const app = createApp();
const TURN_KEYS = ['TURN_CLOUDFLARE_KEY_ID', 'TURN_CLOUDFLARE_API_TOKEN', 'TURN_URLS', 'TURN_USERNAME', 'TURN_CREDENTIAL'];
const saved = Object.fromEntries(TURN_KEYS.map((k) => [k, env[k]]));

let patient;

beforeEach(async () => {
  await resetTestDb();
  resetIceServerCache();
  for (const k of TURN_KEYS) env[k] = '';
  patient = createUser({ role: 'PATIENT', name: 'Anandi' });
});

afterEach(() => {
  Object.assign(env, saved);
  vi.unstubAllGlobals();
});

const iceServers = (user) => {
  const req = request(app).get('/api/appointments/ice-servers');
  return user ? req.set('Cookie', authCookie(user)) : req;
};

describe('video call ICE servers', () => {
  it('requires a signed-in user, since TURN credentials are secret', async () => {
    const res = await iceServers();
    expect(res.status).toBe(401);
  });

  it('falls back to STUN only when no relay is configured', async () => {
    const res = await iceServers(patient);
    expect(res.status).toBe(200);
    expect(res.body.data.relay).toBe(false);
    expect(res.body.data.iceServers).toHaveLength(1);
    expect(res.body.data.iceServers[0].urls[0]).toMatch(/^stun:/);
  });

  it('returns a fixed TURN server with its credentials', async () => {
    env.TURN_URLS = 'turn:relay.example.org:3478, turns:relay.example.org:5349';
    env.TURN_USERNAME = 'user';
    env.TURN_CREDENTIAL = 'secret';
    const res = await iceServers(patient);
    expect(res.body.data.relay).toBe(true);
    expect(res.body.data.iceServers[1]).toEqual({
      urls: ['turn:relay.example.org:3478', 'turns:relay.example.org:5349'],
      username: 'user',
      credential: 'secret',
    });
  });

  it('generates Cloudflare credentials once and reuses them', async () => {
    env.TURN_CLOUDFLARE_KEY_ID = 'key';
    env.TURN_CLOUDFLARE_API_TOKEN = 'token';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      iceServers: [{ urls: ['turn:turn.cloudflare.com:3478?transport=udp'], username: 'u', credential: 'c' }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await iceServers(patient);
    await iceServers(patient);
    expect(first.body.data.relay).toBe(true);
    expect(first.body.data.iceServers[1].username).toBe('u');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/turn/keys/key/credentials/generate-ice-servers');
  });

  it('still answers with STUN when Cloudflare is unreachable', async () => {
    env.TURN_CLOUDFLARE_KEY_ID = 'key';
    env.TURN_CLOUDFLARE_API_TOKEN = 'token';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const res = await iceServers(patient);
    expect(res.status).toBe(200);
    expect(res.body.data.relay).toBe(false);
    expect(res.body.data.iceServers).toHaveLength(1);
  });
});
