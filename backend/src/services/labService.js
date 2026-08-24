import crypto from 'crypto';
import { getDb, transaction } from '../db/connection.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { accessiblePatientIds, assertPatientAccess, CLINICAL_ROLES } from './accessControlService.js';
import { recordAudit } from './auditService.js';
import { notify } from './notificationService.js';
import { NotFoundError, AuthorizationError, ConflictError } from '../utils/errors.js';

const LAB_STAFF = ['DOCTOR', 'SPECIALIST', 'ADMIN'];

const SELECT_BASE = `
  SELECT o.*, p.name AS patient_name, d.name AS doctor_name, f.name AS facility_name
  FROM lab_orders o
  LEFT JOIN patients p ON p.id = o.patient_id
  LEFT JOIN users d ON d.id = o.doctor_id
  LEFT JOIN facilities f ON f.id = o.facility_id
`;

export function listLabOrders(user, { patientId, status, facilityId, page = 1, limit = 20 } = {}) {
  const db = getDb();
  const scope = accessiblePatientIds(user, db);

  const where = [];
  const params = [];

  if (scope !== null) {
    if (scope.length === 0) return { items: [], total: 0 };
    where.push(`o.patient_id IN (${scope.map(() => '?').join(',')})`);
    params.push(...scope);
  }
  if (patientId) { where.push('o.patient_id = ?'); params.push(patientId); }
  if (status) { where.push('o.status = ?'); params.push(status); }
  if (facilityId) { where.push('o.facility_id = ?'); params.push(facilityId); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM lab_orders o ${whereSql}`).get(...params).c;
  const items = db
    .prepare(`${SELECT_BASE} ${whereSql} ORDER BY o.ordered_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);

  return { items, total };
}

export function getLabOrder(user, id, requestMeta = {}) {
  const db = getDb();
  const order = db.prepare(`${SELECT_BASE} WHERE o.id = ?`).get(id);
  if (!order) throw new NotFoundError('Lab order');
  assertPatientAccess(user, order.patient_id, db);

  recordAudit(
    { actorId: user.id, action: 'VIEW_LAB_ORDER', entityType: 'lab_order', entityId: id, ...requestMeta },
    db
  );

  const results = db.prepare('SELECT * FROM lab_results WHERE lab_order_id = ? ORDER BY created_at DESC').all(id);
  return { ...order, results };
}

export function createLabOrder(user, input, requestMeta = {}) {
  if (!CLINICAL_ROLES.includes(user.role)) {
    throw new AuthorizationError('Only doctors and specialists can order lab tests.');
  }

  return transaction((db) => {
    if (!patientRepository.findById(input.patientId, db)) throw new NotFoundError('Patient');
    assertPatientAccess(user, input.patientId, db);

    const id = crypto.randomUUID();
    const ts = new Date().toISOString();

    db.prepare(`
      INSERT INTO lab_orders (id, patient_id, doctor_id, facility_id, consultation_id,
        lab_test_id, test_name, category, priority, status, notes, ordered_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ORDERED', ?, ?, ?, ?)
    `).run(
      id, input.patientId, user.id, input.facilityId ?? user.facility_id ?? null,
      input.consultationId ?? null, input.labTestId ?? null, input.testName,
      input.category ?? null, input.priority || 'ROUTINE', input.notes ?? null, ts, ts, ts
    );

    recordAudit(
      { actorId: user.id, action: 'CREATE_LAB_ORDER', entityType: 'lab_order', entityId: id,
        newValues: { patientId: input.patientId, testName: input.testName }, ...requestMeta },
      db
    );

    return db.prepare(`${SELECT_BASE} WHERE o.id = ?`).get(id);
  });
}

const ORDER_FLOW = {
  ORDERED: ['SAMPLE_COLLECTED', 'CANCELLED'],
  SAMPLE_COLLECTED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function updateLabOrderStatus(user, id, status, requestMeta = {}) {
  if (!LAB_STAFF.includes(user.role)) {
    throw new AuthorizationError('Only lab and clinical staff can update lab orders.');
  }

  return transaction((db) => {
    const order = db.prepare('SELECT * FROM lab_orders WHERE id = ?').get(id);
    if (!order) throw new NotFoundError('Lab order');

    if (!(ORDER_FLOW[order.status] || []).includes(status)) {
      throw new ConflictError(`A lab order cannot move from ${order.status} to ${status}.`);
    }

    db.prepare('UPDATE lab_orders SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id);

    recordAudit(
      { actorId: user.id, action: 'UPDATE_LAB_ORDER', entityType: 'lab_order', entityId: id,
        oldValues: { status: order.status }, newValues: { status }, ...requestMeta },
      db
    );

    return db.prepare(`${SELECT_BASE} WHERE o.id = ?`).get(id);
  });
}

export function recordLabResult(user, orderId, input, requestMeta = {}) {
  if (!LAB_STAFF.includes(user.role)) {
    throw new AuthorizationError('Only lab and clinical staff can record results.');
  }

  return transaction((db) => {
    const order = db.prepare('SELECT * FROM lab_orders WHERE id = ?').get(orderId);
    if (!order) throw new NotFoundError('Lab order');
    if (order.status === 'CANCELLED') {
      throw new ConflictError('Results cannot be recorded for a cancelled order.');
    }

    const id = crypto.randomUUID();
    const ts = new Date().toISOString();

    db.prepare(`
      INSERT INTO lab_results (id, lab_order_id, result, unit, reference_range,
        abnormal_flag, notes, verified_by, verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, orderId, input.result ?? null, input.unit ?? null, input.referenceRange ?? null,
           input.abnormalFlag ?? null, input.notes ?? null, user.id, ts, ts);

    db.prepare('UPDATE lab_orders SET status = ?, updated_at = ? WHERE id = ?')
      .run('COMPLETED', ts, orderId);

    // Alert the ordering clinician, escalating for critical values.
    if (order.doctor_id) {
      notify({
        userId: order.doctor_id,
        type: 'LAB_RESULT',
        priority: input.abnormalFlag === 'CRITICAL' ? 'CRITICAL' : 'NORMAL',
        title: `Lab result ready: ${order.test_name}`,
        message: input.abnormalFlag && input.abnormalFlag !== 'NORMAL'
          ? `Flagged ${input.abnormalFlag}. Review required.`
          : 'Result available for review.',
        metadata: { labOrderId: orderId },
        link: '/doctor/lab-orders',
      }, db);
    }

    recordAudit(
      { actorId: user.id, action: 'RECORD_LAB_RESULT', entityType: 'lab_order', entityId: orderId,
        newValues: { abnormalFlag: input.abnormalFlag }, ...requestMeta },
      db
    );

    return db.prepare('SELECT * FROM lab_results WHERE id = ?').get(id);
  });
}
