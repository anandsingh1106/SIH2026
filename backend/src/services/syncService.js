import { getDb, transaction } from '../db/connection.js';
import { createHomeVisit, createTask, updateTask, createNcdScreening, scheduleVaccination } from './ashaService.js';
import { createPatient } from './patientService.js';
import { recordVitals } from './clinicalService.js';
import { createReferral } from './referralService.js';
import { logger } from '../utils/logger.js';

/**
 * Handlers for each syncable entity/action pair. Each returns the created or
 * updated row so its server id can be reported back to the client.
 */
const HANDLERS = {
  'home_visit:CREATE': (user, payload, meta) => createHomeVisit(user, payload, meta),
  'patient:CREATE': (user, payload, meta) => createPatient(user, payload, meta),
  'task:CREATE': (user, payload, meta) => createTask(user, payload, meta),
  'task:UPDATE': (user, payload, meta) => updateTask(user, payload.id, payload, meta),
  'ncd_screening:CREATE': (user, payload, meta) => createNcdScreening(user, payload, meta),
  'vaccination:CREATE': (user, payload, meta) => scheduleVaccination(user, payload, meta),
  'vitals:CREATE': (user, payload, meta) => recordVitals(user, payload.patientId, payload, meta),
  'referral:CREATE': (user, payload, meta) => createReferral(user, payload, meta),
};

export const SUPPORTED_OPERATIONS = Object.keys(HANDLERS);

/**
 * Processes a batch of queued offline operations.
 *
 * Idempotency: every operation carries a client-generated operationId, recorded
 * in sync_operations. Replaying a batch returns the original result instead of
 * creating duplicates — essential for ASHA workers on poor connectivity (§30).
 *
 * Each operation is committed independently, so one failure cannot discard the
 * rest of the batch.
 */
export function processSyncBatch(user, operations, requestMeta = {}) {
  const db = getDb();
  const results = [];

  for (const op of operations) {
    const { operationId, entity, action, payload, clientTimestamp } = op;

    // Replay of an already-processed operation: return the recorded outcome.
    const existing = db
      .prepare('SELECT * FROM sync_operations WHERE operation_id = ?')
      .get(operationId);

    if (existing) {
      results.push({
        operationId,
        success: existing.status === 'SUCCESS',
        serverId: existing.server_id ?? undefined,
        error: existing.error ?? undefined,
        duplicate: true,
      });
      continue;
    }

    const handler = HANDLERS[`${entity}:${action}`];
    if (!handler) {
      const message = `Unsupported operation ${entity}:${action}.`;
      recordOutcome(db, { operationId, user, entity, action, clientTimestamp,
                          status: 'FAILED', error: message });
      results.push({ operationId, success: false, error: message });
      continue;
    }

    try {
      // One transaction per operation so failures are isolated.
      const row = transaction(() => handler(user, payload, requestMeta));
      const serverId = row?.id;

      recordOutcome(db, { operationId, user, entity, action, clientTimestamp,
                          status: 'SUCCESS', serverId });
      results.push({ operationId, success: true, serverId });
    } catch (err) {
      const message = err?.message || 'Operation failed.';
      logger.warn('Sync operation failed', { operationId, entity, action, message });

      recordOutcome(db, { operationId, user, entity, action, clientTimestamp,
                          status: 'FAILED', error: message });
      results.push({
        operationId,
        success: false,
        error: message,
        code: err?.code || 'SYNC_ERROR',
      });
    }
  }

  return { results };
}

function recordOutcome(db, { operationId, user, entity, action, clientTimestamp, status, serverId, error }) {
  try {
    db.prepare(`
      INSERT INTO sync_operations (operation_id, user_id, entity, action, server_id,
        status, error, client_timestamp, processed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(operationId, user.id, entity, action, serverId ?? null, status,
           error ?? null, clientTimestamp ?? null, new Date().toISOString());
  } catch (err) {
    // A race on the same operationId means another request already recorded it.
    logger.debug('Could not record sync outcome', { operationId, message: err.message });
  }
}
