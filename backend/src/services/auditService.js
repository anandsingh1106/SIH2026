import crypto from 'crypto';
import { getDb } from '../db/connection.js';
import { logger } from '../utils/logger.js';

// Never persisted into audit values, even if a caller passes them in.
const SENSITIVE_FIELDS = new Set([
  'password', 'password_hash', 'token', 'idToken', 'jwt',
  'firebase_uid', 'apiKey', 'secret', 'privateKey',
]);

function scrub(value) {
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_FIELDS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Writes an audit entry. Audit logging must never break the operation being
 * audited, so failures are logged and swallowed rather than thrown.
 *
 * Pass `db` to enlist the write in an existing transaction.
 */
export function recordAudit(
  { actorId, action, entityType, entityId, oldValues, newValues, ipAddress, userAgent },
  db = getDb()
) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id,
                              old_values, new_values, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      actorId ?? null,
      action,
      entityType,
      entityId ?? null,
      oldValues ? JSON.stringify(scrub(oldValues)) : null,
      newValues ? JSON.stringify(scrub(newValues)) : null,
      ipAddress ?? null,
      userAgent ?? null,
      new Date().toISOString()
    );
  } catch (err) {
    logger.error('Failed to write audit log', { action, entityType, message: err.message });
  }
}

/** Convenience wrapper that pulls actor and request metadata off req. */
export function auditFromRequest(req, entry, db) {
  return recordAudit(
    {
      actorId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      ...entry,
    },
    db
  );
}
