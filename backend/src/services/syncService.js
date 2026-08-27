import { getDb, transaction } from '../db/connection.js';
import {
  createHomeVisitSchema, createTaskSchema, createNcdSchema, scheduleVaccinationSchema,
} from '../validators/ashaValidators.js';
import { createPatientSchema } from '../validators/patientValidators.js';
import { createReferralSchema } from '../validators/phase3Validators.js';
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

/**
 * Schemas applied to sync payloads.
 *
 * Sync bypasses the route-level middleware, so without this a malformed
 * payload reaches the database and surfaces as a raw constraint error. Each
 * schema is `.passthrough()` because queued records may carry extra display
 * fields (patientName, for example) that the services ignore.
 */
const PAYLOAD_SCHEMAS = {
  'home_visit:CREATE': createHomeVisitSchema.passthrough(),
  'patient:CREATE': createPatientSchema.passthrough(),
  'task:CREATE': createTaskSchema.passthrough(),
  'ncd_screening:CREATE': createNcdSchema.passthrough(),
  'vaccination:CREATE': scheduleVaccinationSchema.passthrough(),
  'referral:CREATE': createReferralSchema.passthrough(),
};

/**
 * Repairs values that older offline clients queued in the wrong shape.
 *
 * A record captured in the field must not be lost because an earlier app
 * version wrote "High Risk Identified" where the API expects "HIGH". Anything
 * unrecognised is dropped rather than guessed at.
 */
const RISK_WORDS = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

function coercePayload(entity, action, payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const out = { ...payload };

  if (entity === 'home_visit' && typeof out.riskLevel === 'string') {
    const upper = out.riskLevel.toUpperCase();
    const matched = RISK_WORDS.find((w) => upper.includes(w));
    // "Normal" was the old wording for a low-risk screening outcome.
    out.riskLevel = matched || (upper.includes('NORMAL') ? 'LOW' : undefined);
    if (!out.riskLevel) delete out.riskLevel;
  }

  for (const field of ['priority', 'urgency', 'status', 'gender']) {
    if (typeof out[field] === 'string') out[field] = out[field].toUpperCase();
  }

  return out;
}

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
      // Repair legacy shapes, then validate — sync has no route middleware, so
      // without this a bad payload reaches the database as a constraint error.
      const repaired = coercePayload(entity, action, payload);
      const schema = PAYLOAD_SCHEMAS[`${entity}:${action}`];
      const validated = schema ? schema.parse(repaired) : repaired;

      // One transaction per operation so failures are isolated.
      const row = transaction(() => handler(user, validated, requestMeta));
      const serverId = row?.id;

      recordOutcome(db, { operationId, user, entity, action, clientTimestamp,
                          status: 'SUCCESS', serverId });
      results.push({ operationId, success: true, serverId });
    } catch (err) {
      // Zod issues are far more useful to a field worker than a raw
      // "CHECK constraint failed" from the database.
      const message = err?.issues?.length
        ? err.issues.map((i) => `${i.path.join('.') || 'payload'}: ${i.message}`).join('; ')
        : err?.message || 'Operation failed.';

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
