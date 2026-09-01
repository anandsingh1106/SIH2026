import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '../..');

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`FATAL: required environment variable ${name} is not set. See backend/.env.example.`);
    process.exit(1);
  }
  return value;
}

function optional(name, fallback = '') {
  return process.env[name] || fallback;
}

function bool(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: Number(optional('PORT', '4000')),
  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:3000'),
  // Comma-separated origin allowlist; falls back to FRONTEND_URL.
  CORS_ORIGINS: optional('CORS_ORIGINS'),

  JWT_SECRET: required('JWT_SECRET'),

  // The OpenAPI reference maps every endpoint, so it is off unless asked for.
  ENABLE_API_DOCS: bool('ENABLE_API_DOCS', process.env.NODE_ENV !== 'production'),

  // Sessions are long-lived for field workers on poor connectivity; shorten
  // this for deployments handling higher-sensitivity data.
  SESSION_TTL_DAYS: Number(optional('SESSION_TTL_DAYS', '7')),

  // Absolute path to the SQLite file. DATABASE_URL may be a bare path or a
  // file: URL; both resolve relative to the backend directory.
  DATABASE_PATH: (() => {
    const raw = optional('DATABASE_URL', 'arogyasetu.sqlite').replace(/^file:/, '');
    return path.isAbsolute(raw) ? raw : path.join(BACKEND_ROOT, raw);
  })(),

  // Supabase — SUPABASE_SERVICE_ROLE_KEY bypasses RLS and is server-only.
  SUPABASE_URL: optional('SUPABASE_URL'),
  SUPABASE_ANON_KEY: optional('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: optional('SUPABASE_SERVICE_ROLE_KEY'),

  // Direct Postgres connection, used only by the schema migration scripts.
  SUPABASE_DB_URL: optional('SUPABASE_DB_URL'),

  AI_PROVIDER: optional('AI_PROVIDER', 'gemini'),
  // Overrides the provider's default model, so a retired model id can be
  // corrected by redeploying rather than by patching the code.
  AI_MODEL: optional('AI_MODEL'),
  GEMINI_API_KEY: optional('GEMINI_API_KEY'),
  OPENAI_API_KEY: optional('OPENAI_API_KEY'),

  SENDGRID_API_KEY: optional('SENDGRID_API_KEY'),
  SENDGRID_FROM_EMAIL: optional('SENDGRID_FROM_EMAIL'),

  STORAGE_PROVIDER: optional('STORAGE_PROVIDER', 'local'),
  STORAGE_BUCKET: optional('STORAGE_BUCKET'),
  STORAGE_ACCESS_KEY: optional('STORAGE_ACCESS_KEY'),
  STORAGE_SECRET_KEY: optional('STORAGE_SECRET_KEY'),
};

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/**
 * Fails fast on configuration that is survivable in development but unsafe once
 * the service is public. A misconfigured deployment should refuse to boot
 * rather than run in a quietly insecure state.
 */
function assertProductionConfig() {
  if (!isProduction) return;

  const problems = [];

  // A short or default secret means forgeable session tokens, which is a total
  // authentication bypass. 32 chars is the practical floor for HS256.
  if (env.JWT_SECRET.length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters in production.');
  }
  if (/^(secret|changeme|dev|test|password|arogyasetu)$/i.test(env.JWT_SECRET)) {
    problems.push('JWT_SECRET is a well-known placeholder value.');
  }

  const origins = (env.CORS_ORIGINS || env.FRONTEND_URL).split(',').map((o) => o.trim());
  if (origins.some((o) => o.startsWith('http://') && !/localhost|127\.0\.0\.1/.test(o))) {
    problems.push('CORS origins must use https:// in production.');
  }
  if (origins.includes('*')) {
    problems.push('CORS origin "*" cannot be combined with cookie authentication.');
  }

  if (env.SUPABASE_URL && !env.SUPABASE_SERVICE_ROLE_KEY) {
    problems.push('SUPABASE_SERVICE_ROLE_KEY is required when SUPABASE_URL is set.');
  }

  // An AI_PROVIDER naming a provider whose key is absent is always a mistake:
  // it is indistinguishable at runtime from deliberately running without AI,
  // so it would silently serve knowledge base answers forever.
  const aiProvider = (env.AI_PROVIDER || '').toLowerCase();
  if (aiProvider && !['gemini', 'openai', 'none'].includes(aiProvider)) {
    problems.push(`AI_PROVIDER "${env.AI_PROVIDER}" is not a supported provider (gemini, openai, none).`);
  }
  if (aiProvider === 'gemini' && !env.GEMINI_API_KEY) {
    problems.push('AI_PROVIDER is "gemini" but GEMINI_API_KEY is not set. Set the key, or set AI_PROVIDER=none to answer from the built-in knowledge base.');
  }
  if (aiProvider === 'openai' && !env.OPENAI_API_KEY) {
    problems.push('AI_PROVIDER is "openai" but OPENAI_API_KEY is not set. Set the key, or set AI_PROVIDER=none to answer from the built-in knowledge base.');
  }

  if (problems.length) {
    console.error('FATAL: insecure production configuration:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
}

assertProductionConfig();

export { BACKEND_ROOT };
