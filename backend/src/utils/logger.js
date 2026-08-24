import { isProduction, isTest } from '../config/env.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = isTest ? LEVELS.error : isProduction ? LEVELS.info : LEVELS.debug;

// Values under these keys are never written to logs, at any nesting depth.
const REDACTED_KEYS = new Set([
  'password', 'token', 'idtoken', 'jwt', 'authorization', 'cookie',
  'apikey', 'api_key', 'secret', 'privatekey', 'private_key',
  'jwt_secret', 'firebase_private_key', 'sendgrid_api_key',
]);

function redact(value, depth = 0) {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = REDACTED_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, depth + 1);
  }
  return out;
}

function emit(level, message, meta) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta ? redact(meta) : {}),
  };

  const line = isProduction ? JSON.stringify(entry) : `[${level}] ${message}` +
    (meta ? ` ${JSON.stringify(redact(meta))}` : '');

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message, meta) => emit('debug', message, meta),
  info: (message, meta) => emit('info', message, meta),
  warn: (message, meta) => emit('warn', message, meta),
  error: (message, meta) => emit('error', message, meta),
};
