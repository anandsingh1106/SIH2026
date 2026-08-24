import crypto from 'crypto';
import { getDb, transaction } from '../db/connection.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { recordAudit } from './auditService.js';
import { publish } from './eventBus.js';
import { NotFoundError, ConflictError, AuthorizationError } from '../utils/errors.js';

const QUEUE_STAFF = ['DOCTOR', 'SPECIALIST', 'ADMIN'];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

/**
 * Issues the next OPD token.
 *
 * The token number is computed and inserted inside one transaction, and the
 * UNIQUE(facility_id, queue_date, token_number) index guarantees no duplicate
 * token can be issued even under concurrent requests.
 */
export function issueToken(user, { facilityId, patientId, doctorId, appointmentId }, requestMeta = {}) {
  return transaction((db) => {
    if (!db.prepare('SELECT 1 FROM facilities WHERE id = ?').get(facilityId)) {
      throw new NotFoundError('Facility');
    }

    // Patients may only take a token for themselves.
    let resolvedPatientId = patientId;
    if (user.role === 'PATIENT') {
      const own = patientRepository.ensureForUser(user, db);
      resolvedPatientId = own.id;
    } else if (!resolvedPatientId) {
      throw new NotFoundError('Patient');
    }
    if (!patientRepository.findById(resolvedPatientId, db)) throw new NotFoundError('Patient');

    const date = today();

    const existing = db
      .prepare(`
        SELECT * FROM opd_tokens
        WHERE facility_id = ? AND queue_date = ? AND patient_id = ?
          AND status IN ('WAITING','CALLED','IN_PROGRESS')
      `)
      .get(facilityId, date, resolvedPatientId);
    if (existing) {
      throw new ConflictError('This patient already holds an active token for today.');
    }

    const next = db
      .prepare('SELECT COALESCE(MAX(token_number), 0) AS n FROM opd_tokens WHERE facility_id = ? AND queue_date = ?')
      .get(facilityId, date).n + 1;

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO opd_tokens (id, facility_id, patient_id, doctor_id, appointment_id,
        token_number, queue_date, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'WAITING', ?, ?)
    `).run(id, facilityId, resolvedPatientId, doctorId ?? null, appointmentId ?? null,
           next, date, now(), now());

    recordAudit(
      { actorId: user.id, action: 'ISSUE_TOKEN', entityType: 'opd_token', entityId: id,
        newValues: { facilityId, tokenNumber: next }, ...requestMeta },
      db
    );

    publish('queue', { facilityId, tokenId: id, tokenNumber: next, status: 'WAITING' });

    return db.prepare('SELECT * FROM opd_tokens WHERE id = ?').get(id);
  });
}

export function getQueue(facilityId, { date } = {}) {
  const db = getDb();
  const queueDate = date || today();

  const items = db
    .prepare(`
      SELECT t.*, p.name AS patient_name, u.name AS doctor_name
      FROM opd_tokens t
      LEFT JOIN patients p ON p.id = t.patient_id
      LEFT JOIN users u ON u.id = t.doctor_id
      WHERE t.facility_id = ? AND t.queue_date = ?
      ORDER BY t.token_number ASC
    `)
    .all(facilityId, queueDate);

  const waiting = items.filter((t) => t.status === 'WAITING');
  const current = items.find((t) => t.status === 'IN_PROGRESS' || t.status === 'CALLED');

  return {
    date: queueDate,
    items,
    summary: {
      total: items.length,
      waiting: waiting.length,
      completed: items.filter((t) => t.status === 'COMPLETED').length,
      currentToken: current?.token_number ?? null,
      nextToken: waiting[0]?.token_number ?? null,
    },
  };
}

/** Position of a token in the waiting line (1 = next to be called). */
export function tokenPosition(tokenId) {
  const db = getDb();
  const token = db.prepare('SELECT * FROM opd_tokens WHERE id = ?').get(tokenId);
  if (!token) throw new NotFoundError('Token');

  const ahead = db
    .prepare(`
      SELECT COUNT(*) AS c FROM opd_tokens
      WHERE facility_id = ? AND queue_date = ? AND status = 'WAITING' AND token_number < ?
    `)
    .get(token.facility_id, token.queue_date, token.token_number).c;

  return { ...token, position: token.status === 'WAITING' ? ahead + 1 : 0 };
}

const QUEUE_FLOW = {
  WAITING: ['CALLED', 'SKIPPED'],
  CALLED: ['IN_PROGRESS', 'SKIPPED', 'COMPLETED'],
  IN_PROGRESS: ['COMPLETED', 'SKIPPED'],
  COMPLETED: [],
  SKIPPED: ['WAITING'],
};

export function updateTokenStatus(user, tokenId, status, requestMeta = {}) {
  if (!QUEUE_STAFF.includes(user.role)) {
    throw new AuthorizationError('Only clinical staff can manage the queue.');
  }

  return transaction((db) => {
    const token = db.prepare('SELECT * FROM opd_tokens WHERE id = ?').get(tokenId);
    if (!token) throw new NotFoundError('Token');

    if (!(QUEUE_FLOW[token.status] || []).includes(status)) {
      throw new ConflictError(`A token cannot move from ${token.status} to ${status}.`);
    }

    const sets = ['status = ?', 'updated_at = ?'];
    const params = [status, now()];
    if (status === 'CALLED') { sets.push('called_at = ?'); params.push(now()); }
    if (status === 'COMPLETED') { sets.push('completed_at = ?'); params.push(now()); }
    params.push(tokenId);

    db.prepare(`UPDATE opd_tokens SET ${sets.join(', ')} WHERE id = ?`).run(...params);

    recordAudit(
      { actorId: user.id, action: `QUEUE_${status}`, entityType: 'opd_token', entityId: tokenId,
        oldValues: { status: token.status }, newValues: { status }, ...requestMeta },
      db
    );

    publish('queue', {
      facilityId: token.facility_id, tokenId, tokenNumber: token.token_number, status,
    });

    return db.prepare('SELECT * FROM opd_tokens WHERE id = ?').get(tokenId);
  });
}
