import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeminiProvider } from '../src/services/ai/provider.js';

/**
 * Guards the Gemini response handling. tests/setup.js pins AI_PROVIDER=none so
 * no suite reaches the network, so each test here builds the provider directly
 * with a stubbed fetch rather than going through getAIProvider().
 */

const realFetch = globalThis.fetch;

/** A provider bound to a fake key, bypassing the env-based singleton. */
function geminiProvider(model) {
  return new GeminiProvider('test-key-not-real', model);
}

/** A Gemini response body with the given candidate fields. */
function reply({ finishReason = 'STOP', parts = [{ text: 'ok' }], thoughts = 0 } = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ finishReason, content: { parts } }],
      usageMetadata: { thoughtsTokenCount: thoughts },
    }),
  };
}

describe('Gemini provider', () => {
  let sent;

  beforeEach(() => {
    sent = null;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('reserves token headroom for the reasoning pass', async () => {
    globalThis.fetch = vi.fn(async (_url, opts) => {
      sent = JSON.parse(opts.body);
      return reply();
    });

    const provider = geminiProvider();
    await provider.complete({ prompt: 'q', maxTokens: 500 });

    // Gemini 3.x bills reasoning against maxOutputTokens, so the caller's
    // budget must survive as headroom for the visible reply.
    expect(sent.generationConfig.maxOutputTokens).toBeGreaterThan(500);
  });

  it('joins every text part rather than keeping only the first', async () => {
    globalThis.fetch = vi.fn(async () =>
      // A thought part carries no text and must not appear in the answer.
      reply({ parts: [{ text: 'First half. ' }, { thoughtSignature: 'x' }, { text: 'Second half.' }] })
    );

    const provider = geminiProvider();
    expect(await provider.complete({ prompt: 'q' })).toBe('First half. Second half.');
  });

  it('rejects a truncated answer instead of returning half a sentence', async () => {
    globalThis.fetch = vi.fn(async () =>
      reply({
        finishReason: 'MAX_TOKENS',
        parts: [{ text: 'Watch for these danger signs:' }],
        thoughts: 478,
      })
    );

    const provider = geminiProvider();
    // Half of a clinical instruction reads as complete, so it must not be
    // handed back as an answer.
    await expect(provider.complete({ prompt: 'q' })).rejects.toThrow(/incomplete/i);
  });

  it('surfaces a retired model id as a failed call', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      text: async () => '{"error":{"message":"model is no longer available"}}',
    }));

    const provider = geminiProvider();
    await expect(provider.complete({ prompt: 'q' })).rejects.toThrow();
  });

  it('honours AI_MODEL over the built-in default', async () => {
    let calledUrl;
    globalThis.fetch = vi.fn(async (url) => { calledUrl = url; return reply(); });

    const provider = geminiProvider('gemini-custom-test');
    await provider.complete({ prompt: 'q' });

    expect(calledUrl).toContain('gemini-custom-test');
  });
});
