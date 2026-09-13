import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetTestDb } from './helpers.js';
import { getDb } from '../src/db/connection.js';

// The registration path runs behind Supabase token verification, which no test
// can satisfy for real. Stubbing just that step lets the provisioning rules
// below — the part that actually decides what is stored — be exercised.
vi.mock('../src/services/supabaseAuthService.js', () => ({
  verifySupabaseToken: vi.fn(),
}));

const { verifySupabaseToken } = await import('../src/services/supabaseAuthService.js');
const { supabaseLogin } = await import('../src/services/authService.js');

function verifiedAs(overrides = {}) {
  verifySupabaseToken.mockResolvedValue({
    authUserId: `auth-${Math.random().toString(36).slice(2)}`,
    email: overrides.email ?? `citizen-${Math.random().toString(36).slice(2)}@example.invalid`,
    emailConfirmed: true,
    assuranceLevel: 'aal1',
    mfaSatisfied: false,
    authMethods: ['password'],
    profileHints: {},
    ...overrides,
  });
}

const requestMeta = { ipAddress: '127.0.0.1', userAgent: 'vitest' };

describe('ABHA requirement at registration', () => {
  beforeEach(async () => {
    await resetTestDb();
    vi.clearAllMocks();
  });

  it('refuses a citizen account with no ABHA', async () => {
    verifiedAs();

    await expect(
      supabaseLogin({
        accessToken: 'stub',
        profile: { name: 'Demo Citizen', role: 'patient' },
        requestMeta,
      })
    ).rejects.toMatchObject({ code: 'ABHA_REQUIRED', status: 400 });
  });

  it('creates a citizen account when an ABHA number is supplied', async () => {
    verifiedAs();

    const { user, created } = await supabaseLogin({
      accessToken: 'stub',
      profile: { name: 'Demo Citizen', role: 'patient', abhaId: '91000000000123' },
      requestMeta,
    });

    expect(created).toBe(true);
    expect(user.abha_id).toBe('91000000000123');
  });

  it('accepts an ABHA address as well as a number', async () => {
    verifiedAs();

    const { user } = await supabaseLogin({
      accessToken: 'stub',
      profile: { name: 'Demo Citizen', role: 'patient', abhaId: 'demo.citizen@abdm' },
      requestMeta,
    });

    expect(user.abha_id).toBe('demo.citizen@abdm');
  });

  it('falls back to the ABHA captured in signup metadata', async () => {
    verifiedAs({ profileHints: { name: 'Demo Citizen', role: 'patient', abhaId: '91000000000456' } });

    const { user } = await supabaseLogin({ accessToken: 'stub', requestMeta });
    expect(user.abha_id).toBe('91000000000456');
  });

  it.each([
    ['asha', 'ASHA worker'],
    ['doctor', 'medical officer'],
    ['specialist', 'specialist'],
    ['admin', 'administrator'],
  ])('exempts a %s claim, which is identified by HPR ID instead', async (role) => {
    verifiedAs();

    const { user, created } = await supabaseLogin({
      accessToken: 'stub',
      profile: { name: 'Demo Staff', role, registrationNumber: 'HPR-DEMO-1' },
      requestMeta,
    });

    expect(created).toBe(true);
    // Still provisioned as a patient row until an administrator approves the
    // claim — the exemption is about ABHA, not about privilege.
    expect(user.role).toBe('PATIENT');
    expect(user.abha_id).toBeFalsy();
  });

  it('applies the rule only to new accounts, not to every field write', async () => {
    // A row provisioned before this rule existed can hold no ABHA. The check
    // sits on the creation path alone, so such a user is not locked out of
    // their own account by a rule added later.
    verifiedAs();

    const { user } = await supabaseLogin({
      accessToken: 'stub',
      profile: { name: 'Demo Citizen', role: 'patient', abhaId: '91000000000789' },
      requestMeta,
    });

    getDb().prepare('UPDATE users SET abha_id = NULL WHERE id = ?').run(user.id);
    const stored = getDb().prepare('SELECT abha_id FROM users WHERE id = ?').get(user.id);
    expect(stored.abha_id).toBeNull();
  });
});
