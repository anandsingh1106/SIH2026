import crypto from 'crypto';
import { getDb, transaction } from '../db/connection.js';
import { recordAudit } from './auditService.js';
import { notify } from './notificationService.js';
import { MFA_REQUIRED_ROLES } from './mfaService.js';
import { AppError, NotFoundError, ConflictError } from '../utils/errors.js';

/**
 * Staff access requests.
 *
 * Public signup always produces a PATIENT. This is the only path by which an
 * account becomes staff, and every step of it is audited — granting a clinical
 * role hands someone other people's health records, so it must always trace
 * back to a named administrator who decided.
 */

export const REQUESTABLE_ROLES = ['ASHA', 'DOCTOR', 'SPECIALIST', 'ADMIN'];

/**
 * Roles whose claim should carry a verifiable credential.
 *
 * Not enforced as mandatory — a reviewer may know an applicant personally, and
 * blocking on a field format would just teach people to type nonsense into it.
 * It is recorded so the reviewer has something to check.
 */
const CREDENTIAL_HINT = {
  DOCTOR: 'HPR ID or state medical council registration number',
  SPECIALIST: 'HPR ID or state medical council registration number',
  ASHA: 'ASHA employee or district health society ID',
  ADMIN: 'Government employee ID',
};

const now = () => new Date().toISOString();

/** Creates the request row. Called inside the registration transaction. */
export function createRequestForNewUser(
  { userId, requestedRole, registrationNumber, facilityName, designation, note },
  db = getDb()
) {
  const id = crypto.randomUUID();
  const ts = now();

  // Match a named facility to a real one where possible, so the reviewer sees a
  // resolved site rather than free text.
  const facility = facilityName
    ? db.prepare('SELECT id, name FROM facilities WHERE name = ? AND active = 1').get(facilityName)
    : null;

  db.prepare(`
    INSERT INTO staff_access_requests
      (id, user_id, requested_role, registration_number, facility_id, facility_name,
       designation, note, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(
    id, userId, requestedRole, registrationNumber ?? null,
    facility?.id ?? null, facilityName ?? null, designation ?? null, note ?? null, ts, ts
  );

  // Tell administrators there is something to review. Broadcast to the role
  // rather than one person, so a request is not blocked on one admin's absence.
  notify(
    {
      role: 'ADMIN',
      type: 'STAFF_ACCESS_REQUEST',
      title: 'New staff access request',
      message: `A user has requested ${requestedRole} access and is awaiting review.`,
      link: '/admin/staff-requests',
      priority: 'NORMAL',
    },
    db
  );

  return {
    id,
    requestedRole,
    status: 'PENDING',
    credentialHint: CREDENTIAL_HINT[requestedRole],
  };
}

/**
 * Files a request for an existing account — a patient who later joins the
 * service, or someone re-applying after a rejection.
 */
export function createRequest(user, input, requestMeta = {}) {
  if (!REQUESTABLE_ROLES.includes(input.requestedRole)) {
    throw new AppError('That is not a role you can request.', {
      status: 400,
      code: 'INVALID_ROLE_REQUEST',
    });
  }

  if (user.role === input.requestedRole) {
    throw new ConflictError('You already have this role.');
  }

  return transaction((db) => {
    const existing = db
      .prepare("SELECT id FROM staff_access_requests WHERE user_id = ? AND status = 'PENDING'")
      .get(user.id);

    if (existing) {
      throw new ConflictError('You already have a request awaiting review.');
    }

    const request = createRequestForNewUser({ userId: user.id, ...input }, db);

    recordAudit(
      {
        actorId: user.id, action: 'STAFF_ACCESS_REQUESTED', entityType: 'user',
        entityId: user.id, newValues: { requestedRole: input.requestedRole },
        ...requestMeta,
      },
      db
    );

    return request;
  });
}

/** The signed-in user's own most recent request. */
export function myRequest(user, db = getDb()) {
  const row = db
    .prepare('SELECT * FROM staff_access_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(user.id);

  if (!row) return null;

  return {
    id: row.id,
    requestedRole: row.requested_role,
    status: row.status,
    // A rejected applicant is told why, so they can correct and re-apply.
    reviewNote: row.status === 'REJECTED' ? row.review_note : undefined,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

/** Review queue, pending first. */
export function listRequests({ status = 'PENDING', page = 1, limit = 20 } = {}, db = getDb()) {
  const where = status === 'ALL' ? '' : 'WHERE r.status = ?';
  const params = status === 'ALL' ? [] : [status];

  const total = db
    .prepare(`SELECT COUNT(*) AS c FROM staff_access_requests r ${where}`)
    .get(...params).c;

  const items = db
    .prepare(`
      SELECT r.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
             u.district AS user_district, u.role AS current_role,
             f.name AS resolved_facility_name,
             rev.name AS reviewer_name
      FROM staff_access_requests r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN facilities f ON f.id = r.facility_id
      LEFT JOIN users rev ON rev.id = r.reviewed_by
      ${where}
      ORDER BY CASE r.status WHEN 'PENDING' THEN 0 ELSE 1 END, r.created_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(...params, limit, (page - 1) * limit);

  return {
    items: items.map((r) => ({
      id: r.id,
      status: r.status,
      requestedRole: r.requested_role,
      currentRole: r.current_role,
      applicant: {
        id: r.user_id,
        name: r.user_name,
        email: r.user_email,
        phone: r.user_phone,
        district: r.user_district,
      },
      registrationNumber: r.registration_number || undefined,
      credentialHint: CREDENTIAL_HINT[r.requested_role],
      facility: r.resolved_facility_name || r.facility_name || undefined,
      facilityMatched: Boolean(r.facility_id),
      designation: r.designation || undefined,
      note: r.note || undefined,
      reviewedBy: r.reviewer_name || undefined,
      reviewedAt: r.reviewed_at || undefined,
      reviewNote: r.review_note || undefined,
      createdAt: r.created_at,
    })),
    total,
  };
}

function loadPending(requestId, db) {
  const row = db.prepare('SELECT * FROM staff_access_requests WHERE id = ?').get(requestId);
  if (!row) throw new NotFoundError('Request');

  if (row.status !== 'PENDING') {
    throw new ConflictError(`This request was already ${row.status.toLowerCase()}.`);
  }
  return row;
}

/**
 * Grants the requested role.
 *
 * This is the moment someone gains access to other people's health records, so
 * it is deliberately narrow: only an ADMIN reaches it, the acting admin's own
 * session must already have satisfied 2FA (enforced at the route), and the
 * grant is audited with both parties named.
 */
export function approveRequest(admin, requestId, { reviewNote, facilityId } = {}, requestMeta = {}) {
  return transaction((db) => {
    const request = loadPending(requestId, db);

    // Self-approval would defeat the entire control.
    if (request.user_id === admin.id) {
      throw new AppError('You cannot approve your own access request.', {
        status: 403,
        code: 'SELF_APPROVAL_FORBIDDEN',
      });
    }

    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(request.user_id);
    if (!target) throw new NotFoundError('User');

    const ts = now();
    const grantedFacility = facilityId ?? request.facility_id ?? null;

    db.prepare(`
      UPDATE users SET role = ?, facility_id = ?, updated_at = ? WHERE id = ?
    `).run(request.requested_role, grantedFacility, ts, target.id);

    db.prepare(`
      UPDATE staff_access_requests
      SET status = 'APPROVED', reviewed_by = ?, reviewed_at = ?, review_note = ?,
          facility_id = ?, updated_at = ?
      WHERE id = ?
    `).run(admin.id, ts, reviewNote ?? null, grantedFacility, ts, request.id);

    recordAudit(
      {
        actorId: admin.id,
        action: 'STAFF_ACCESS_APPROVED',
        entityType: 'user',
        entityId: target.id,
        oldValues: { role: target.role },
        newValues: { role: request.requested_role, facilityId: grantedFacility },
        ...requestMeta,
      },
      db
    );

    // Every requestable role requires 2FA, so say so plainly — the user will
    // otherwise hit the enrolment gate with no idea why.
    const needsMfa = MFA_REQUIRED_ROLES.includes(request.requested_role);
    notify(
      {
        userId: target.id,
        type: 'STAFF_ACCESS_APPROVED',
        title: 'Staff access approved',
        message: needsMfa
          ? `You now have ${request.requested_role} access. Sign out and back in, then set up two-factor authentication to continue.`
          : `You now have ${request.requested_role} access. Sign out and back in to use it.`,
        priority: 'HIGH',
      },
      db
    );

    return {
      id: request.id,
      status: 'APPROVED',
      userId: target.id,
      grantedRole: request.requested_role,
      // The role lives in the database, not the token, so it takes effect on
      // the next request — but the session's assurance level does not, and a
      // new staff role needs 2FA. Hence: sign in again.
      requiresReauth: true,
    };
  });
}

export function rejectRequest(admin, requestId, { reviewNote } = {}, requestMeta = {}) {
  return transaction((db) => {
    const request = loadPending(requestId, db);

    const ts = now();
    db.prepare(`
      UPDATE staff_access_requests
      SET status = 'REJECTED', reviewed_by = ?, reviewed_at = ?, review_note = ?, updated_at = ?
      WHERE id = ?
    `).run(admin.id, ts, reviewNote ?? null, ts, request.id);

    recordAudit(
      {
        actorId: admin.id,
        action: 'STAFF_ACCESS_REJECTED',
        entityType: 'user',
        entityId: request.user_id,
        newValues: { requestedRole: request.requested_role, reason: reviewNote ?? null },
        ...requestMeta,
      },
      db
    );

    notify(
      {
        userId: request.user_id,
        type: 'STAFF_ACCESS_REJECTED',
        title: 'Staff access request not approved',
        message: reviewNote
          ? `Your request was not approved: ${reviewNote}`
          : 'Your request was not approved. Contact your district health office for details.',
        priority: 'NORMAL',
      },
      db
    );

    return { id: request.id, status: 'REJECTED' };
  });
}

/** Lets an applicant cancel their own pending request. */
export function withdrawRequest(user, requestId, requestMeta = {}) {
  return transaction((db) => {
    const request = loadPending(requestId, db);

    if (request.user_id !== user.id) {
      // 404 rather than 403, so request ids cannot be probed.
      throw new NotFoundError('Request');
    }

    const ts = now();
    db.prepare(
      "UPDATE staff_access_requests SET status = 'WITHDRAWN', updated_at = ? WHERE id = ?"
    ).run(ts, request.id);

    recordAudit(
      {
        actorId: user.id, action: 'STAFF_ACCESS_WITHDRAWN', entityType: 'user',
        entityId: user.id, ...requestMeta,
      },
      db
    );

    return { id: request.id, status: 'WITHDRAWN' };
  });
}

/**
 * Directly changes a user's role.
 *
 * Kept separate from the request flow for the cases it does not cover:
 * revoking access when someone leaves, or correcting a mistaken grant.
 */
export function setUserRole(admin, targetUserId, newRole, requestMeta = {}) {
  if (![...REQUESTABLE_ROLES, 'PATIENT'].includes(newRole)) {
    throw new AppError('Unknown role.', { status: 400, code: 'INVALID_ROLE' });
  }

  return transaction((db) => {
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
    if (!target) throw new NotFoundError('User');

    if (target.id === admin.id) {
      // Otherwise an admin could demote themselves and strand the deployment
      // with no administrator at all.
      throw new AppError('You cannot change your own role.', {
        status: 403,
        code: 'SELF_ROLE_CHANGE_FORBIDDEN',
      });
    }

    const ts = now();
    db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(newRole, ts, target.id);

    recordAudit(
      {
        actorId: admin.id,
        action: 'ROLE_CHANGED',
        entityType: 'user',
        entityId: target.id,
        oldValues: { role: target.role },
        newValues: { role: newRole },
        ...requestMeta,
      },
      db
    );

    return { userId: target.id, role: newRole };
  });
}
