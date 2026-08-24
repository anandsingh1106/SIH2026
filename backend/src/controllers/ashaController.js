import * as asha from '../services/ashaService.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

function meta(req) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') };
}

function parseArray(value) {
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
}

function toPublicHomeVisit(row) {
  return {
    id: row.id,
    ashaId: row.asha_id || undefined,
    ashaName: row.asha_name || undefined,
    patientId: row.patient_id,
    patientName: row.patient_name || undefined,
    householdId: row.household_id || undefined,
    date: row.visit_date,
    purpose: row.purpose || undefined,
    observations: row.observations || undefined,
    symptoms: parseArray(row.symptoms),
    dangerSignsIdentified: parseArray(row.danger_signs),
    riskLevel: row.risk_level || undefined,
    referralRecommended: !!row.referral_recommended,
    notes: row.notes || undefined,
    nextVisitDate: row.next_visit_date || undefined,
    syncStatus: row.sync_status,
  };
}

function toPublicTask(row) {
  return {
    id: row.id,
    assignedTo: row.assigned_to || undefined,
    patientId: row.patient_id || undefined,
    patientName: row.patient_name || undefined,
    type: row.type,
    title: row.title,
    description: row.description || undefined,
    priority: row.priority,
    dueDate: row.due_date || undefined,
    status: row.status,
    completedAt: row.completed_at || undefined,
  };
}

function toPublicVaccination(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name || undefined,
    name: row.vaccine_name,
    dose: row.dose || undefined,
    scheduledDate: row.scheduled_date || undefined,
    administeredDate: row.administered_date || undefined,
    batchNumber: row.batch_number || undefined,
    status: row.status,
  };
}

function toPublicMaternal(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name || undefined,
    lmpDate: row.lmp_date || undefined,
    eddDate: row.edd_date || undefined,
    gravida: row.gravida ?? undefined,
    parity: row.parity ?? undefined,
    highRisk: !!row.high_risk,
    riskFactors: parseArray(row.risk_factors),
    jsskRegistered: !!row.jssk_registered,
    pmsmaRegistered: !!row.pmsma_registered,
    outcome: row.outcome || undefined,
  };
}

function toPublicAncVisit(row) {
  return {
    id: row.id,
    visitNumber: row.visit_number,
    date: row.visit_date,
    weight: row.weight ?? undefined,
    bpSystolic: row.blood_pressure_systolic ?? undefined,
    bpDiastolic: row.blood_pressure_diastolic ?? undefined,
    hemoglobin: row.hemoglobin ?? undefined,
    fundalHeight: row.fundal_height || undefined,
    fetalHeartRate: row.fetal_heart_rate ?? undefined,
    tetanusGiven: !!row.tetanus_given,
    ifaTabletsGiven: row.ifa_tablets_given ?? undefined,
    notes: row.notes || undefined,
  };
}

function toPublicNcd(row, assessment) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name || undefined,
    date: row.screening_date,
    age: row.age ?? undefined,
    bpSystolic: row.blood_pressure_systolic ?? undefined,
    bpDiastolic: row.blood_pressure_diastolic ?? undefined,
    bloodGlucose: row.blood_glucose ?? undefined,
    bmi: row.bmi ?? undefined,
    waistCircumference: row.waist_circumference ?? undefined,
    tobaccoUse: !!row.tobacco_use,
    alcoholUse: !!row.alcohol_use,
    cbacScore: row.cbac_score ?? undefined,
    riskCategory: row.risk_category || undefined,
    suspectedDiabetes: !!row.suspected_diabetes,
    suspectedHypertension: !!row.suspected_hypertension,
    recommendations: parseArray(row.recommendations),
    assessment,
  };
}

// ─── Home visits ────────────────────────────────────────────────────────────

export function getHomeVisits(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = asha.listHomeVisits(req.user, { ...filters, page, limit });
    return sendPaginated(res, items.map(toPublicHomeVisit), { page, limit, total });
  } catch (err) { next(err); }
}

export function postHomeVisit(req, res, next) {
  try {
    const row = asha.createHomeVisit(req.user, req.body, meta(req));
    return sendSuccess(res, toPublicHomeVisit(row), 201);
  } catch (err) { next(err); }
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export function getTasks(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = asha.listTasks(req.user, { ...filters, page, limit });
    return sendPaginated(res, items.map(toPublicTask), { page, limit, total });
  } catch (err) { next(err); }
}

export function postTask(req, res, next) {
  try {
    const row = asha.createTask(req.user, req.body, meta(req));
    return sendSuccess(res, toPublicTask(row), 201);
  } catch (err) { next(err); }
}

export function patchTask(req, res, next) {
  try {
    const row = asha.updateTask(req.user, req.params.id, req.body, meta(req));
    return sendSuccess(res, toPublicTask(row));
  } catch (err) { next(err); }
}

// ─── Vaccinations ───────────────────────────────────────────────────────────

export function getVaccinations(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = asha.listVaccinations(req.user, { ...filters, page, limit });
    return sendPaginated(res, items.map(toPublicVaccination), { page, limit, total });
  } catch (err) { next(err); }
}

export function postVaccination(req, res, next) {
  try {
    const row = asha.scheduleVaccination(req.user, req.body, meta(req));
    return sendSuccess(res, toPublicVaccination(row), 201);
  } catch (err) { next(err); }
}

export function postAdministerVaccination(req, res, next) {
  try {
    const row = asha.administerVaccination(req.user, req.params.id, req.body, meta(req));
    return sendSuccess(res, toPublicVaccination(row));
  } catch (err) { next(err); }
}

// ─── Maternal ───────────────────────────────────────────────────────────────

export function getMaternalRecords(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = asha.listMaternalRecords(req.user, { ...filters, page, limit });
    return sendPaginated(res, items.map(toPublicMaternal), { page, limit, total });
  } catch (err) { next(err); }
}

export function postMaternalRecord(req, res, next) {
  try {
    const row = asha.createMaternalRecord(req.user, req.body, meta(req));
    return sendSuccess(res, toPublicMaternal(row), 201);
  } catch (err) { next(err); }
}

export function postAncVisit(req, res, next) {
  try {
    const row = asha.addAncVisit(req.user, req.params.id, req.body, meta(req));
    return sendSuccess(res, toPublicAncVisit(row), 201);
  } catch (err) { next(err); }
}

// ─── NCD screening ──────────────────────────────────────────────────────────

export function getNcdScreenings(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = asha.listNcdScreenings(req.user, { ...filters, page, limit });
    return sendPaginated(res, items.map((r) => toPublicNcd(r)), { page, limit, total });
  } catch (err) { next(err); }
}

export function postNcdScreening(req, res, next) {
  try {
    const row = asha.createNcdScreening(req.user, req.body, meta(req));
    return sendSuccess(res, toPublicNcd(row, row.assessment), 201);
  } catch (err) { next(err); }
}
