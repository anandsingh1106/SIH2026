import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { ExternalServiceError } from '../../utils/errors.js';

/**
 * AIProvider interface:
 *   complete({ system, prompt, maxTokens }) -> Promise<string>
 *   isConfigured() -> boolean
 *
 * API keys stay on the server and are never returned to the client (§31).
 */

class GeminiProvider {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    // Google retires model ids on their own schedule; a retired one returns 404
    // rather than degrading, so this is overridable without a code change.
    this.model = model || 'gemini-3.6-flash';
  }

  isConfigured() { return Boolean(this.apiKey); }

  async complete({ system, prompt, maxTokens = 800 }) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // 404 means the model id is retired or misspelled — a configuration fault
      // that no amount of retrying fixes, so it is named as such in the log.
      if (res.status === 404) {
        logger.error('Gemini model unavailable — set AI_MODEL to a current model id', {
          model: this.model, body: body.slice(0, 300),
        });
      } else {
        logger.error('Gemini request failed', { status: res.status, body: body.slice(0, 300) });
      }
      throw new ExternalServiceError('gemini', 'The AI service is currently unavailable.');
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }
}

class OpenAIProvider {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model || 'gpt-4o-mini';
  }

  isConfigured() { return Boolean(this.apiKey); }

  async complete({ system, prompt, maxTokens = 800 }) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error('OpenAI request failed', { status: res.status, body: body.slice(0, 300) });
      throw new ExternalServiceError('openai', 'The AI service is currently unavailable.');
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  }
}

/** Used when no key is configured: deterministic output only, never invented. */
class UnconfiguredProvider {
  isConfigured() { return false; }
  async complete() {
    throw new ExternalServiceError('ai', 'No AI provider is configured on the server.');
  }
}

let provider = null;

export function getAIProvider() {
  if (provider) return provider;

  const name = (env.AI_PROVIDER || 'gemini').toLowerCase();
  if (name === 'openai' && env.OPENAI_API_KEY) provider = new OpenAIProvider(env.OPENAI_API_KEY, env.AI_MODEL);
  else if (name === 'gemini' && env.GEMINI_API_KEY) provider = new GeminiProvider(env.GEMINI_API_KEY, env.AI_MODEL);
  else provider = new UnconfiguredProvider();

  // Which mode the assistant is running in is otherwise invisible until someone
  // asks a question and gets a knowledge base answer they expected to be live.
  if (provider.isConfigured()) {
    logger.info('AI provider ready', { provider: name, model: provider.model });
  } else {
    logger.warn(
      'No AI provider configured — the assistant will answer from the built-in knowledge base only.',
      { aiProvider: name || '(unset)' }
    );
  }

  return provider;
}

// Allows tests to inject a stub provider.
export function setAIProvider(custom) {
  provider = custom;
}
