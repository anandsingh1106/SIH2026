import crypto from 'crypto';
import { getDb, transaction } from '../db/connection.js';
import { accessiblePatientIds, canAccessPatient } from './accessControlService.js';
import { recordAudit } from './auditService.js';
import { notify } from './notificationService.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors.js';

const AUTHOR_ROLES = ['DOCTOR', 'SPECIALIST'];
const now = () => new Date().toISOString();

/**
 * A specialist also reaches the patients referred to them, who may live
 * outside the district their own facility covers.
 */
function referredToUser(user, patientId, db) {
  return !!db
    .prepare('SELECT 1 FROM referrals WHERE patient_id = ? AND referred_to = ? LIMIT 1')
    .get(patientId, user.id);
}

function canSeePlan(user, plan, db) {
  if (user.role === 'ADMIN' || plan.created_by === user.id) return true;
  return canAccessPatient(user, plan.patient_id, db) || referredToUser(user, plan.patient_id, db);
}

function loadPhases(planIds, db) {
  if (planIds.length === 0) return new Map();
  const rows = db
    .prepare(`
      SELECT * FROM treatment_plan_phases
      WHERE plan_id IN (${planIds.map(() => '?').join(',')})
      ORDER BY position ASC
    `)
    .all(...planIds);
  const byPlan = new Map();
  for (const row of rows) {
    if (!byPlan.has(row.plan_id)) byPlan.set(row.plan_id, []);
    byPlan.get(row.plan_id).push(row);
  }
  return byPlan;
}

const PLAN_SELECT = `
  SELECT tp.*, p.name AS patient_name, p.abha_id AS patient_abha_id, p.village AS patient_village,
         u.name AS author_name, r.referral_code, asha.name AS asha_name
  FROM treatment_plans tp
  JOIN patients p ON p.id = tp.patient_id
  LEFT JOIN users u ON u.id = tp.created_by
  LEFT JOIN users asha ON asha.id = p.assigned_asha_id
  LEFT JOIN referrals r ON r.id = tp.referral_id
`;

function withPhases(rows, db) {
  const phases = loadPhases(rows.map((r) => r.id), db);
  return rows.map((r) => ({ ...r, phases: phases.get(r.id) ?? [] }));
}

export function listPlans(user, { patientId, status, mine, page = 1, limit = 20 } = {}) {
  const db = getDb();
  const where = [];
  const params = [];

  if (mine) {
    where.push('tp.created_by = ?');
    params.push(user.id);
  } else if (user.role !== 'ADMIN') {
    // Plans the user wrote, plus plans for any patient they can already reach.
    const scope = accessiblePatientIds(user, db) ?? [];
    const referred = user.role === 'SPECIALIST'
      ? db.prepare('SELECT DISTINCT patient_id FROM referrals WHERE referred_to = ?').all(user.id).map((r) => r.patient_id)
      : [];
    const ids = [...new Set([...scope, ...referred])];
    const clauses = ['tp.created_by = ?'];
    params.push(user.id);
    if (ids.length) {
      clauses.push(`tp.patient_id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    }
    where.push(`(${clauses.join(' OR ')})`);
  }
  if (patientId) { where.push('tp.patient_id = ?'); params.push(patientId); }
  if (status) { where.push('tp.status = ?'); params.push(status); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM treatment_plans tp ${whereSql}`).get(...params).c;
  const rows = db
    .prepare(`
      ${PLAN_SELECT} ${whereSql}
      ORDER BY CASE tp.status WHEN 'REVIEW_REQUIRED' THEN 0 WHEN 'ACTIVE' THEN 1 ELSE 2 END,
               tp.updated_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(...params, limit, (page - 1) * limit);

  return { items: withPhases(rows, db), total };
}

export function getPlan(user, id, db = getDb()) {
  const row = db.prepare(`${PLAN_SELECT} WHERE tp.id = ?`).get(id);
  // Not found rather than forbidden, so ids cannot be probed.
  if (!row || !canSeePlan(user, row, db)) throw new NotFoundError('Treatment plan');
  return withPhases([row], db)[0];
}

export function createPlan(user, input, requestMeta = {}) {
  if (!AUTHOR_ROLES.includes(user.role)) {
    throw new AuthorizationError('Only doctors and specialists can write a treatment plan.');
  }

  return transaction((db) => {
    const patient = db.prepare('SELECT id, name, assigned_asha_id FROM patients WHERE id = ?').get(input.patientId);
    if (!patient || !(canAccessPatient(user, patient.id, db) || referredToUser(user, patient.id, db))) {
      throw new NotFoundError('Patient');
    }

    if (input.referralId) {
      const referral = db.prepare('SELECT patient_id FROM referrals WHERE id = ?').get(input.referralId);
      if (!referral || referral.patient_id !== patient.id) {
        throw new ValidationError('That referral does not belong to this patient.');
      }
    }

    const id = crypto.randomUUID();
    const ts = now();
    db.prepare(`
      INSERT INTO treatment_plans (id, patient_id, referral_id, created_by, title, specialty,
        directives, status, start_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
    `).run(
      id, patient.id, input.referralId ?? null, user.id, input.title, input.specialty ?? null,
      input.directives ?? null, input.startDate ?? ts.slice(0, 10), ts, ts
    );

    const insPhase = db.prepare(`
      INSERT INTO treatment_plan_phases (id, plan_id, position, title, description, target_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    input.phases.forEach((phase, index) => {
      insPhase.run(crypto.randomUUID(), id, index + 1, phase.title, phase.description ?? null,
                   phase.targetDate ?? null);
    });

    recordAudit(
      { actorId: user.id, action: 'CREATE_TREATMENT_PLAN', entityType: 'treatment_plan', entityId: id,
        newValues: { patientId: patient.id, title: input.title, phases: input.phases.length }, ...requestMeta },
      db
    );

    // The ASHA is the one who follows the plan up at home.
    if (patient.assigned_asha_id) {
      notify({
        userId: patient.assigned_asha_id,
        type: 'TREATMENT_PLAN',
        title: `New treatment plan for ${patient.name}`,
        message: input.title,
        priority: 'NORMAL',
      }, db);
    }

    return getPlan(user, id, db);
  });
}

export function updatePlan(user, id, input, requestMeta = {}) {
  return transaction((db) => {
    const plan = getPlan(user, id, db);
    if (plan.created_by !== user.id && user.role !== 'ADMIN') {
      throw new AuthorizationError('Only the author of a plan can change it.');
    }

    const sets = [];
    const params = [];
    for (const [key, column] of [['title', 'title'], ['specialty', 'specialty'],
      ['directives', 'directives'], ['status', 'status']]) {
      if (input[key] === undefined) continue;
      sets.push(`${column} = ?`);
      params.push(input[key] === '' ? null : input[key]);
    }
    if (sets.length) {
      sets.push('updated_at = ?');
      db.prepare(`UPDATE treatment_plans SET ${sets.join(', ')} WHERE id = ?`).run(...params, now(), id);
      recordAudit(
        { actorId: user.id, action: 'UPDATE_TREATMENT_PLAN', entityType: 'treatment_plan', entityId: id,
          oldValues: { status: plan.status }, newValues: input, ...requestMeta },
        db
      );
    }
    return getPlan(user, id, db);
  });
}

/** Marks one phase done or not done. Any clinician who can see the plan may. */
export function setPhaseCompleted(user, planId, phaseId, completed, requestMeta = {}) {
  if (!AUTHOR_ROLES.includes(user.role)) {
    throw new AuthorizationError('Only doctors and specialists can update plan progress.');
  }

  return transaction((db) => {
    const plan = getPlan(user, planId, db);
    if (['COMPLETED', 'CANCELLED'].includes(plan.status)) {
      throw new ValidationError('This plan is closed. Reopen it before changing its phases.');
    }
    const phase = plan.phases.find((p) => p.id === phaseId);
    if (!phase) throw new NotFoundError('Plan phase');

    const ts = now();
    db.prepare('UPDATE treatment_plan_phases SET completed_at = ?, completed_by = ? WHERE id = ?')
      .run(completed ? ts : null, completed ? user.id : null, phaseId);
    db.prepare('UPDATE treatment_plans SET updated_at = ? WHERE id = ?').run(ts, planId);

    recordAudit(
      { actorId: user.id, action: completed ? 'COMPLETE_PLAN_PHASE' : 'REOPEN_PLAN_PHASE',
        entityType: 'treatment_plan', entityId: planId, newValues: { phaseId }, ...requestMeta },
      db
    );
    return getPlan(user, planId, db);
  });
}
