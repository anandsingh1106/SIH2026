import crypto from 'crypto';
import { getDb, transaction } from '../db/connection.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { recordAudit } from './auditService.js';
import { publish } from './eventBus.js';
import { NotFoundError, ConflictError, AuthorizationError } from '../utils/errors.js';

const MANAGE_ROLES = ['DOCTOR', 'SPECIALIST', 'ADMIN'];

export function listBeds({ facilityId, type, status, page = 1, limit = 50 } = {}) {
  const db = getDb();
  const where = [];
  const params = [];

  if (facilityId) { where.push('b.facility_id = ?'); params.push(facilityId); }
  if (type) { where.push('b.type = ?'); params.push(type); }
  if (status) { where.push('b.status = ?'); params.push(status); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM beds b ${whereSql}`).get(...params).c;

  const items = db
    .prepare(`
      SELECT b.*, f.name AS facility_name,
             p.name AS patient_name, a.id AS allocation_id, a.allocated_at
      FROM beds b
      LEFT JOIN facilities f ON f.id = b.facility_id
      LEFT JOIN bed_allocations a ON a.bed_id = b.id AND a.released_at IS NULL
      LEFT JOIN patients p ON p.id = a.patient_id
      ${whereSql}
      ORDER BY b.ward, b.bed_number
      LIMIT ? OFFSET ?
    `)
    .all(...params, limit, (page - 1) * limit);

  return { items, total };
}

/** Aggregate availability per facility/type — safe for dashboards. */
export function bedAvailability({ facilityId } = {}) {
  const db = getDb();
  const params = [];
  let whereSql = '';
  if (facilityId) { whereSql = 'WHERE b.facility_id = ?'; params.push(facilityId); }

  return db
    .prepare(`
      SELECT b.facility_id, f.name AS facility_name, b.type,
             COUNT(*) AS total,
             SUM(CASE WHEN b.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available,
             SUM(CASE WHEN b.status = 'OCCUPIED' THEN 1 ELSE 0 END) AS occupied
      FROM beds b
      LEFT JOIN facilities f ON f.id = b.facility_id
      ${whereSql}
      GROUP BY b.facility_id, b.type
      ORDER BY f.name, b.type
    `)
    .all(...params);
}

export function createBed(user, input, requestMeta = {}) {
  if (user.role !== 'ADMIN') {
    throw new AuthorizationError('Only administrators can add beds.');
  }
  return transaction((db) => {
    const id = crypto.randomUUID();
    const ts = new Date().toISOString();
    db.prepare(`
      INSERT INTO beds (id, facility_id, ward, bed_number, type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'AVAILABLE', ?, ?)
    `).run(id, input.facilityId, input.ward ?? null, input.bedNumber, input.type || 'GENERAL', ts, ts);

    recordAudit(
      { actorId: user.id, action: 'CREATE_BED', entityType: 'bed', entityId: id,
        newValues: { facilityId: input.facilityId, bedNumber: input.bedNumber }, ...requestMeta },
      db
    );
    return db.prepare('SELECT * FROM beds WHERE id = ?').get(id);
  });
}

/**
 * Allocates a bed to a patient.
 *
 * Runs in a transaction and re-reads the bed row inside it, so two concurrent
 * allocations cannot both succeed. The partial unique index on
 * bed_allocations(bed_id) WHERE released_at IS NULL is the final guarantee.
 */
export function allocateBed(user, bedId, { patientId, referralId, notes }, requestMeta = {}) {
  if (!MANAGE_ROLES.includes(user.role)) {
    throw new AuthorizationError('Only clinical staff can allocate beds.');
  }

  return transaction((db) => {
    const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(bedId);
    if (!bed) throw new NotFoundError('Bed');

    if (bed.status === 'MAINTENANCE') {
      throw new ConflictError('This bed is under maintenance.');
    }
    if (bed.status === 'OCCUPIED') {
      throw new ConflictError('This bed is already occupied.');
    }

    const live = db
      .prepare('SELECT 1 FROM bed_allocations WHERE bed_id = ? AND released_at IS NULL')
      .get(bedId);
    if (live) throw new ConflictError('This bed is already allocated.');

    if (!patientRepository.findById(patientId, db)) throw new NotFoundError('Patient');

    const id = crypto.randomUUID();
    const ts = new Date().toISOString();
    db.prepare(`
      INSERT INTO bed_allocations (id, bed_id, patient_id, referral_id, allocated_by,
                                   allocated_at, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, bedId, patientId, referralId ?? null, user.id, ts, notes ?? null, ts);

    db.prepare('UPDATE beds SET status = ?, updated_at = ? WHERE id = ?')
      .run('OCCUPIED', ts, bedId);

    if (referralId) {
      db.prepare('UPDATE referrals SET allocated_bed_id = ?, updated_at = ? WHERE id = ?')
        .run(bedId, ts, referralId);
    }

    recordAudit(
      { actorId: user.id, action: 'ALLOCATE_BED', entityType: 'bed', entityId: bedId,
        newValues: { patientId, allocationId: id }, ...requestMeta },
      db
    );

    publish('bed', { bedId, facilityId: bed.facility_id, status: 'OCCUPIED' });

    return db.prepare('SELECT * FROM bed_allocations WHERE id = ?').get(id);
  });
}

export function releaseBed(user, bedId, requestMeta = {}) {
  if (!MANAGE_ROLES.includes(user.role)) {
    throw new AuthorizationError('Only clinical staff can release beds.');
  }

  return transaction((db) => {
    const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(bedId);
    if (!bed) throw new NotFoundError('Bed');

    const allocation = db
      .prepare('SELECT * FROM bed_allocations WHERE bed_id = ? AND released_at IS NULL')
      .get(bedId);
    if (!allocation) throw new ConflictError('This bed is not currently allocated.');

    const ts = new Date().toISOString();
    db.prepare('UPDATE bed_allocations SET released_at = ? WHERE id = ?').run(ts, allocation.id);
    db.prepare('UPDATE beds SET status = ?, updated_at = ? WHERE id = ?').run('AVAILABLE', ts, bedId);

    recordAudit(
      { actorId: user.id, action: 'RELEASE_BED', entityType: 'bed', entityId: bedId,
        oldValues: { patientId: allocation.patient_id }, ...requestMeta },
      db
    );

    publish('bed', { bedId, facilityId: bed.facility_id, status: 'AVAILABLE' });

    return db.prepare('SELECT * FROM beds WHERE id = ?').get(bedId);
  });
}

export function updateBedStatus(user, bedId, status, requestMeta = {}) {
  if (!MANAGE_ROLES.includes(user.role)) {
    throw new AuthorizationError('Only clinical staff can change bed status.');
  }

  return transaction((db) => {
    const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(bedId);
    if (!bed) throw new NotFoundError('Bed');

    // Occupancy is driven by allocations, not by direct status edits.
    if (status === 'OCCUPIED') {
      throw new ConflictError('Allocate the bed to a patient instead of setting it to OCCUPIED.');
    }
    if (bed.status === 'OCCUPIED') {
      throw new ConflictError('Release the current patient before changing this bed\'s status.');
    }

    db.prepare('UPDATE beds SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), bedId);

    recordAudit(
      { actorId: user.id, action: 'UPDATE_BED_STATUS', entityType: 'bed', entityId: bedId,
        oldValues: { status: bed.status }, newValues: { status }, ...requestMeta },
      db
    );

    publish('bed', { bedId, facilityId: bed.facility_id, status });
    return db.prepare('SELECT * FROM beds WHERE id = ?').get(bedId);
  });
}
