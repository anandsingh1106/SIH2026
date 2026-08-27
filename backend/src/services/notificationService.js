import crypto from 'crypto';
import { getDb } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';
import { publish } from './eventBus.js';

/**
 * Creates a notification. Targets either one user (`userId`) or a broadcast
 * audience (`role` and/or `facilityId`).
 *
 * Notification delivery must never break the operation that triggered it, so
 * failures are logged rather than thrown.
 */
export function notify({ userId, role, facilityId, type, title, message, priority, link, metadata }, db = getDb()) {
  try {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, role, facility_id, type, title, message,
                                 priority, link, metadata, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      id, userId ?? null, role ?? null, facilityId ?? null, type, title,
      message ?? null, priority || 'NORMAL', link ?? null,
      metadata ? JSON.stringify(metadata) : null, new Date().toISOString()
    );

    publish('notification', { id, userId, role, facilityId, type, title, message, link });
    return id;
  } catch (err) {
    logger.error('Failed to create notification', { type, title, message: err.message });
    return null;
  }
}

/**
 * Raises an urgent clinical alert about a patient to their assigned ASHA and
 * to the patient themselves.
 *
 * Either recipient may be absent -- a patient without a portal login, or one
 * not yet assigned an ASHA -- so the alert is delivered to whoever exists and
 * the caller is told which recipients were reached.
 */
export function sendUrgentPatientAlert(user, { patientId, title, message }, db = getDb()) {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
  if (!patient) throw new NotFoundError('Patient');

  const alertTitle = title || `Urgent: ${patient.name}`;
  const notified = [];

  if (patient.assigned_asha_id) {
    notify(
      {
        userId: patient.assigned_asha_id,
        type: 'URGENT_PATIENT_ALERT',
        title: alertTitle,
        message,
        priority: 'CRITICAL',
        link: `/asha/patients`,
        metadata: { patientId, raisedBy: user.id },
      },
      db
    );
    notified.push('ASHA');
  }

  if (patient.user_id) {
    notify(
      {
        userId: patient.user_id,
        type: 'URGENT_PATIENT_ALERT',
        title: alertTitle,
        message,
        priority: 'CRITICAL',
        link: `/patient/dashboard`,
        metadata: { patientId, raisedBy: user.id },
      },
      db
    );
    notified.push('PATIENT');
  }

  return { patientId, patientName: patient.name, notified };
}

/** Notifications visible to a user: their own plus matching broadcasts. */
export function listNotifications(user, { unreadOnly = false, page = 1, limit = 20 } = {}) {
  const db = getDb();
  const where = ['(n.user_id = ? OR (n.user_id IS NULL AND (n.role IS NULL OR n.role = ?) AND (n.facility_id IS NULL OR n.facility_id = ?)))'];
  const params = [user.id, user.role, user.facility_id ?? null];

  if (unreadOnly) where.push('n.read = 0');

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS c FROM notifications n ${whereSql}`).get(...params).c;
  const items = db
    .prepare(`SELECT * FROM notifications n ${whereSql} ORDER BY n.created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);

  return { items, total };
}

export function unreadCount(user) {
  const db = getDb();
  return db
    .prepare(`
      SELECT COUNT(*) AS c FROM notifications n
      WHERE n.read = 0
        AND (n.user_id = ? OR (n.user_id IS NULL AND (n.role IS NULL OR n.role = ?)
             AND (n.facility_id IS NULL OR n.facility_id = ?)))
    `)
    .get(user.id, user.role, user.facility_id ?? null).c;
}

export function markRead(user, id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
  if (!row) throw new NotFoundError('Notification');

  const targetsUser = row.user_id === user.id;
  const targetsAudience =
    row.user_id === null &&
    (row.role === null || row.role === user.role) &&
    (row.facility_id === null || row.facility_id === user.facility_id);

  if (!targetsUser && !targetsAudience) throw new NotFoundError('Notification');

  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
  return db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
}

export function markAllRead(user) {
  const db = getDb();
  const result = db
    .prepare(`
      UPDATE notifications SET read = 1
      WHERE read = 0
        AND (user_id = ? OR (user_id IS NULL AND (role IS NULL OR role = ?)
             AND (facility_id IS NULL OR facility_id = ?)))
    `)
    .run(user.id, user.role, user.facility_id ?? null);
  return { updated: result.changes ?? 0 };
}
