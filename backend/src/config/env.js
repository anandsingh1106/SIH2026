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

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: Number(optional('PORT', '4000')),
  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:3000'),

  JWT_SECRET: required('JWT_SECRET'),

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

export { BACKEND_ROOT };
