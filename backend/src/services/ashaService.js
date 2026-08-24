import crypto from 'crypto';
import { getDb, transaction } from '../db/connection.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { accessiblePatientIds, assertPatientAccess, FIELD_ROLES } from './accessControlService.js';
import { recordAudit } from './auditService.js';
import { notify } from './notificationService.js';
import { calculateCbac } from './cbacService.js';
import { NotFoundError, AuthorizationError } from '../utils/errors.js';

const now = () => new Date().toISOString();

function assertFieldStaff(user, action) {
  if (!FIELD_ROLES.includes(user.role) && user.role !== 'ADMIN') {
    throw new AuthorizationError(`Only field and clinical staff can ${action}.`);
  }
}

function scopeClause(user, db, column = 'patient_id') {
  const scope = accessiblePatientIds(user, db);
  if (scope === null) return { sql: '', params: [] };
  if (scope.length === 0) return { sql: `AND 1 = 0`, params: [] };
  return { sql: `AND ${column} IN (${scope.map(() => '?').join(',')})`, params: scope };
}

// ─── Home visits ────────────────────────────────────────────────────────────

export function listHomeVisits(user, { patientId, ashaId, page = 1, limit = 20 } = {}) {
  const db = getDb();
  const scope = scopeClause(user, db, 'v.patient_id');

  const where = ['1 = 1', scope.sql].filter(Boolean).join(' ');
  const params = [...scope.params];
  let extra = '';
  if (patientId) { extra += ' AND v.patient_id = ?'; params.push(patientId); }
  if (ashaId) { extra += ' AND v.asha_id = ?'; params.push(ashaId); }

  const whereSql = `WHERE ${where}${extra}`;
  const total = db.prepare(`SELECT COUNT(*) AS c FROM home_visits v ${whereSql}`).get(...params).c;
  const items = db
    .prepare(`
      SELECT v.*, p.name AS patient_name, u.name AS asha_name
      FROM home_visits v
      LEFT JOIN patients p ON p.id = v.patient_id
      LEFT JOIN users u ON u.id = v.asha_id
      ${whereSql} ORDER BY v.visit_date DESC LIMIT ? OFFSET ?
    `)
    .all(...params, limit, (page - 1) * limit);

  return { items, total };
}

export function createHomeVisit(user, input, requestMeta = {}) {
  assertFieldStaff(user, 'record home visits');

  return transaction((db) => {
    if (!patientRepository.findById(input.patientId, db)) throw new NotFoundError('Patient');
    assertPatientAccess(user, input.patientId, db);

    const id = input.id || crypto.randomUUID();
    const ts = now();

    db.prepare(`
      INSERT INTO home_visits (id, asha_id, patient_id, household_id, visit_date, purpose,
        observations, symptoms, danger_signs, risk_level, referral_recommended, notes,
        next_visit_date, latitude, longitude, sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?, ?)
    `).run(
      id, user.role === 'ASHA' ? user.id : (input.ashaId ?? null), input.patientId,
      input.householdId ?? null, input.visitDate, input.purpose ?? null,
      input.observations ?? null,
      input.symptoms ? JSON.stringify(input.symptoms) : null,
      input.dangerSigns ? JSON.stringify(input.dangerSigns) : null,
      input.riskLevel ?? null, input.referralRecommended ? 1 : 0, input.notes ?? null,
      input.nextVisitDate ?? null, input.latitude ?? null, input.longitude ?? null, ts, ts
    );

    // A critical finding must reach a clinician, not sit in a field record.
    if (input.riskLevel === 'CRITICAL' || input.referralRecommended) {
      notify({
        role: 'DOCTOR',
        facilityId: user.facility_id ?? null,
        type: 'HOME_VISIT_ALERT',
        priority: input.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        title: `Home visit flagged: ${input.riskLevel || 'referral recommended'}`,
        message: `A home visit for a patient was flagged by ${user.name}.`,
        metadata: { homeVisitId: id, patientId: input.patientId },
        link: '/doctor/patients',
      }, db);
    }

    recordAudit(
      { actorId: user.id, action: 'RECORD_HOME_VISIT', entityType: 'home_visit', entityId: id,
        newValues: { patientId: input.patientId, riskLevel: input.riskLevel }, ...requestMeta },
      db
    );

    return db.prepare('SELECT * FROM home_visits WHERE id = ?').get(id);
  });
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export function listTasks(user, { status, assignedTo, priority, page = 1, limit = 20 } = {}) {
  const db = getDb();
  const where = [];
  const params = [];

  // Staff see their own queue by default; admins see everything.
  if (user.role === 'ADMIN') {
    if (assignedTo) { where.push('t.assigned_to = ?'); params.push(assignedTo); }
  } else {
    where.push('t.assigned_to = ?');
    params.push(user.id);
  }
  if (status) { where.push('t.status = ?'); params.push(status); }
  if (priority) { where.push('t.priority = ?'); params.push(priority); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM tasks t ${whereSql}`).get(...params).c;
  const items = db
    .prepare(`
      SELECT t.*, p.name AS patient_name
      FROM tasks t LEFT JOIN patients p ON p.id = t.patient_id
      ${whereSql}
      ORDER BY CASE t.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1
                               WHEN 'MEDIUM' THEN 2 ELSE 3 END,
               t.due_date ASC
      LIMIT ? OFFSET ?
    `)
    .all(...params, limit, (page - 1) * limit);

  return { items, total };
}

export function createTask(user, input, requestMeta = {}) {
  assertFieldStaff(user, 'create tasks');

  return transaction((db) => {
    const id = crypto.randomUUID();
    const ts = now();
    const assignedTo = input.assignedTo ?? user.id;

    if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(assignedTo)) {
      throw new NotFoundError('Assignee');
    }
    if (input.patientId && !patientRepository.findById(input.patientId, db)) {
      throw new NotFoundError('Patient');
    }

    db.prepare(`
      INSERT INTO tasks (id, assigned_to, created_by, patient_id, facility_id, type, title,
        description, priority, due_date, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TODO', ?, ?)
    `).run(id, assignedTo, user.id, input.patientId ?? null,
           input.facilityId ?? user.facility_id ?? null, input.type || 'GENERAL',
           input.title, input.description ?? null, input.priority || 'MEDIUM',
           input.dueDate ?? null, ts, ts);

    if (assignedTo !== user.id) {
      notify({
        userId: assignedTo, type: 'TASK',
        priority: input.priority === 'URGENT' ? 'HIGH' : 'NORMAL',
        title: `New task: ${input.title}`,
        message: input.description || 'A task has been assigned to you.',
        metadata: { taskId: id }, link: '/asha/tasks',
      }, db);
    }

    recordAudit(
      { actorId: user.id, action: 'CREATE_TASK', entityType: 'task', entityId: id, ...requestMeta },
      db
    );

    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  });
}

export function updateTask(user, id, input, requestMeta = {}) {
  return transaction((db) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) throw new NotFoundError('Task');

    // Only the assignee, creator or an admin may change a task.
    if (user.role !== 'ADMIN' && task.assigned_to !== user.id && task.created_by !== user.id) {
      throw new NotFoundError('Task');
    }

    const sets = ['updated_at = ?'];
    const params = [now()];
    const columns = { title: 'title', description: 'description', priority: 'priority',
                      dueDate: 'due_date', status: 'status' };
    for (const [key, column] of Object.entries(columns)) {
      if (input[key] !== undefined) { sets.push(`${column} = ?`); params.push(input[key]); }
    }
    if (input.status === 'COMPLETED') { sets.push('completed_at = ?'); params.push(now()); }

    params.push(id);
    db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params);

    recordAudit(
      { actorId: user.id, action: 'UPDATE_TASK', entityType: 'task', entityId: id,
        oldValues: { status: task.status }, newValues: { status: input.status }, ...requestMeta },
      db
    );

    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  });
}

// ─── Immunization ───────────────────────────────────────────────────────────

export function listVaccinations(user, { patientId, status, dueBefore, page = 1, limit = 50 } = {}) {
  const db = getDb();
  const scope = scopeClause(user, db, 'v.patient_id');

  const params = [...scope.params];
  let extra = '';
  if (patientId) { extra += ' AND v.patient_id = ?'; params.push(patientId); }
  if (status) { extra += ' AND v.status = ?'; params.push(status); }
  if (dueBefore) { extra += ' AND v.scheduled_date <= ?'; params.push(dueBefore); }

  const whereSql = `WHERE 1 = 1 ${scope.sql}${extra}`;
  const total = db.prepare(`SELECT COUNT(*) AS c FROM vaccinations v ${whereSql}`).get(...params).c;
  const items = db
    .prepare(`
      SELECT v.*, p.name AS patient_name FROM vaccinations v
      LEFT JOIN patients p ON p.id = v.patient_id
      ${whereSql} ORDER BY v.scheduled_date ASC LIMIT ? OFFSET ?
    `)
    .all(...params, limit, (page - 1) * limit);

  return { items, total };
}

export function scheduleVaccination(user, input, requestMeta = {}) {
  assertFieldStaff(user, 'schedule vaccinations');

  return transaction((db) => {
    if (!patientRepository.findById(input.patientId, db)) throw new NotFoundError('Patient');
    assertPatientAccess(user, input.patientId, db);

    const id = crypto.randomUUID();
    const ts = now();
    db.prepare(`
      INSERT INTO vaccinations (id, patient_id, vaccine_name, dose, scheduled_date,
        status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'DUE', ?, ?, ?)
    `).run(id, input.patientId, input.vaccineName, input.dose ?? null,
           input.scheduledDate ?? null, input.notes ?? null, ts, ts);

    recordAudit(
      { actorId: user.id, action: 'SCHEDULE_VACCINATION', entityType: 'vaccination', entityId: id, ...requestMeta },
      db
    );
    return db.prepare('SELECT * FROM vaccinations WHERE id = ?').get(id);
  });
}

export function administerVaccination(user, id, input, requestMeta = {}) {
  assertFieldStaff(user, 'administer vaccinations');

  return transaction((db) => {
    const record = db.prepare('SELECT * FROM vaccinations WHERE id = ?').get(id);
    if (!record) throw new NotFoundError('Vaccination');
    assertPatientAccess(user, record.patient_id, db);

    db.prepare(`
      UPDATE vaccinations SET status = 'GIVEN', administered_date = ?, administered_by = ?,
        facility_id = ?, batch_number = ?, updated_at = ? WHERE id = ?
    `).run(input.administeredDate || now().slice(0, 10), user.id,
           input.facilityId ?? user.facility_id ?? null, input.batchNumber ?? null, now(), id);

    recordAudit(
      { actorId: user.id, action: 'ADMINISTER_VACCINATION', entityType: 'vaccination', entityId: id, ...requestMeta },
      db
    );
    return db.prepare('SELECT * FROM vaccinations WHERE id = ?').get(id);
  });
}

// ─── Maternal health ────────────────────────────────────────────────────────

export function listMaternalRecords(user, { patientId, highRisk, page = 1, limit = 20 } = {}) {
  const db = getDb();
  // Maternal data is restricted: only field/clinical staff and admins (§15).
  if (!FIELD_ROLES.includes(user.role) && user.role !== 'ADMIN' && user.role !== 'PATIENT') {
    throw new AuthorizationError('You are not permitted to view maternal records.');
  }

  const scope = scopeClause(user, db, 'm.patient_id');
  const params = [...scope.params];
  let extra = '';
  if (patientId) { extra += ' AND m.patient_id = ?'; params.push(patientId); }
  if (highRisk !== undefined) { extra += ' AND m.high_risk = ?'; params.push(highRisk ? 1 : 0); }

  const whereSql = `WHERE 1 = 1 ${scope.sql}${extra}`;
  const total = db.prepare(`SELECT COUNT(*) AS c FROM maternal_records m ${whereSql}`).get(...params).c;
  const items = db
    .prepare(`
      SELECT m.*, p.name AS patient_name FROM maternal_records m
      LEFT JOIN patients p ON p.id = m.patient_id
      ${whereSql} ORDER BY m.created_at DESC LIMIT ? OFFSET ?
    `)
    .all(...params, limit, (page - 1) * limit);

  return { items, total };
}

export function createMaternalRecord(user, input, requestMeta = {}) {
  assertFieldStaff(user, 'register pregnancies');

  return transaction((db) => {
    if (!patientRepository.findById(input.patientId, db)) throw new NotFoundError('Patient');
    assertPatientAccess(user, input.patientId, db);

    // EDD is derived from LMP by Naegele's rule when not supplied.
    let edd = input.eddDate;
    if (!edd && input.lmpDate) {
      const lmp = new Date(input.lmpDate);
      lmp.setDate(lmp.getDate() + 280);
      edd = lmp.toISOString().slice(0, 10);
    }

    const id = crypto.randomUUID();
    const ts = now();
    db.prepare(`
      INSERT INTO maternal_records (id, patient_id, asha_id, lmp_date, edd_date, gravida,
        parity, high_risk, risk_factors, jssk_registered, pmsma_registered, outcome,
        created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ONGOING', ?, ?)
    `).run(id, input.patientId, user.role === 'ASHA' ? user.id : (input.ashaId ?? null),
           input.lmpDate ?? null, edd ?? null, input.gravida ?? null, input.parity ?? null,
           input.highRisk ? 1 : 0, input.riskFactors ? JSON.stringify(input.riskFactors) : null,
           input.jsskRegistered ? 1 : 0, input.pmsmaRegistered ? 1 : 0, ts, ts);

    recordAudit(
      { actorId: user.id, action: 'CREATE_MATERNAL_RECORD', entityType: 'maternal_record',
        entityId: id, ...requestMeta },
      db
    );
    return db.prepare('SELECT * FROM maternal_records WHERE id = ?').get(id);
  });
}

export function addAncVisit(user, maternalRecordId, input, requestMeta = {}) {
  assertFieldStaff(user, 'record ANC visits');

  return transaction((db) => {
    const record = db.prepare('SELECT * FROM maternal_records WHERE id = ?').get(maternalRecordId);
    if (!record) throw new NotFoundError('Maternal record');
    assertPatientAccess(user, record.patient_id, db);

    const nextNumber = input.visitNumber ??
      (db.prepare('SELECT COALESCE(MAX(visit_number),0) AS n FROM anc_visits WHERE maternal_record_id = ?')
         .get(maternalRecordId).n + 1);

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO anc_visits (id, maternal_record_id, visit_number, visit_date, recorded_by,
        weight, blood_pressure_systolic, blood_pressure_diastolic, hemoglobin, fundal_height,
        fetal_heart_rate, tetanus_given, ifa_tablets_given, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, maternalRecordId, nextNumber, input.visitDate, user.id,
           input.weight ?? null, input.bloodPressureSystolic ?? null,
           input.bloodPressureDiastolic ?? null, input.hemoglobin ?? null,
           input.fundalHeight ?? null, input.fetalHeartRate ?? null,
           input.tetanusGiven ? 1 : 0, input.ifaTabletsGiven ?? null,
           input.notes ?? null, now());

    // Danger signs during pregnancy must escalate.
    const severeAnaemia = input.hemoglobin != null && input.hemoglobin < 7;
    const severeHypertension = input.bloodPressureSystolic != null && input.bloodPressureSystolic >= 140;

    if (severeAnaemia || severeHypertension) {
      db.prepare('UPDATE maternal_records SET high_risk = 1, updated_at = ? WHERE id = ?')
        .run(now(), maternalRecordId);

      notify({
        role: 'DOCTOR', facilityId: user.facility_id ?? null,
        type: 'MATERNAL_ALERT', priority: 'HIGH',
        title: 'High-risk ANC finding recorded',
        message: severeAnaemia
          ? 'Severe anaemia recorded at an ANC visit. Urgent review advised.'
          : 'Raised blood pressure recorded at an ANC visit. Urgent review advised.',
        metadata: { maternalRecordId, ancVisitId: id },
        link: '/doctor/patients',
      }, db);
    }

    recordAudit(
      { actorId: user.id, action: 'RECORD_ANC_VISIT', entityType: 'maternal_record',
        entityId: maternalRecordId, ...requestMeta },
      db
    );

    return db.prepare('SELECT * FROM anc_visits WHERE id = ?').get(id);
  });
}

// ─── NCD screening ──────────────────────────────────────────────────────────

export function listNcdScreenings(user, { patientId, riskCategory, page = 1, limit = 20 } = {}) {
  const db = getDb();
  const scope = scopeClause(user, db, 'n.patient_id');
  const params = [...scope.params];
  let extra = '';
  if (patientId) { extra += ' AND n.patient_id = ?'; params.push(patientId); }
  if (riskCategory) { extra += ' AND n.risk_category = ?'; params.push(riskCategory); }

  const whereSql = `WHERE 1 = 1 ${scope.sql}${extra}`;
  const total = db.prepare(`SELECT COUNT(*) AS c FROM ncd_screenings n ${whereSql}`).get(...params).c;
  const items = db
    .prepare(`
      SELECT n.*, p.name AS patient_name FROM ncd_screenings n
      LEFT JOIN patients p ON p.id = n.patient_id
      ${whereSql} ORDER BY n.screening_date DESC LIMIT ? OFFSET ?
    `)
    .all(...params, limit, (page - 1) * limit);

  return { items, total };
}

export function createNcdScreening(user, input, requestMeta = {}) {
  assertFieldStaff(user, 'record NCD screenings');

  return transaction((db) => {
    const patient = patientRepository.findById(input.patientId, db);
    if (!patient) throw new NotFoundError('Patient');
    assertPatientAccess(user, input.patientId, db);

    // Age comes from the patient record when not supplied.
    let age = input.age;
    if (age == null && patient.date_of_birth) {
      age = Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000);
    }

    const assessment = calculateCbac({ ...input, age, gender: patient.gender });

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO ncd_screenings (id, patient_id, screened_by, facility_id, screening_date, age,
        blood_pressure_systolic, blood_pressure_diastolic, blood_glucose, bmi, waist_circumference,
        tobacco_use, alcohol_use, physical_activity_adequate, family_history, cbac_score,
        risk_category, suspected_diabetes, suspected_hypertension, recommendations, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, input.patientId, user.id, input.facilityId ?? user.facility_id ?? null,
      input.screeningDate || now().slice(0, 10), age ?? null,
      input.bloodPressureSystolic ?? null, input.bloodPressureDiastolic ?? null,
      input.bloodGlucose ?? null, input.bmi ?? null, input.waistCircumference ?? null,
      input.tobaccoUse ? 1 : 0, input.alcoholUse ? 1 : 0,
      input.physicalActivityAdequate === false ? 0 : 1, input.familyHistory ? 1 : 0,
      assessment.score, assessment.riskCategory,
      assessment.suspectedDiabetes ? 1 : 0, assessment.suspectedHypertension ? 1 : 0,
      JSON.stringify(assessment.recommendations), now()
    );

    if (assessment.riskCategory === 'HIGH') {
      notify({
        role: 'DOCTOR', facilityId: user.facility_id ?? null,
        type: 'NCD_ALERT', priority: 'HIGH',
        title: 'High-risk NCD screening recorded',
        message: `CBAC score ${assessment.score}. Clinical evaluation recommended.`,
        metadata: { screeningId: id, patientId: input.patientId },
        link: '/doctor/patients',
      }, db);
    }

    recordAudit(
      { actorId: user.id, action: 'RECORD_NCD_SCREENING', entityType: 'ncd_screening', entityId: id,
        newValues: { riskCategory: assessment.riskCategory }, ...requestMeta },
      db
    );

    const row = db.prepare('SELECT * FROM ncd_screenings WHERE id = ?').get(id);
    return { ...row, assessment };
  });
}
