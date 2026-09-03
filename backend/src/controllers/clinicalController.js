import * as clinical from '../services/clinicalService.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

function requestMeta(req) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') };
}

function parseJsonArray(value) {
  if (!value) return undefined;
  try { return JSON.parse(value); } catch { return undefined; }
}

function toPublicConsultation(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name || undefined,
    doctorId: row.doctor_id || undefined,
    doctorName: row.doctor_name || undefined,
    facilityId: row.facility_id || undefined,
    facilityName: row.facility_name || undefined,
    appointmentId: row.appointment_id || undefined,
    chiefComplaint: row.chief_complaint || undefined,
    symptoms: parseJsonArray(row.symptoms) || [],
    examination: row.examination || undefined,
    diagnosis: row.diagnosis || undefined,
    icdCode: row.icd_code || undefined,
    clinicalNotes: row.clinical_notes || undefined,
    treatmentPlan: row.treatment_plan || undefined,
    followUpDate: row.follow_up_date || undefined,
    isTelemedicine: !!row.is_telemedicine,
    status: row.status,
    date: row.created_at,
  };
}

function toPublicVitals(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    temperature: row.temperature ?? undefined,
    bpSystolic: row.blood_pressure_systolic ?? undefined,
    bpDiastolic: row.blood_pressure_diastolic ?? undefined,
    pulse: row.heart_rate ?? undefined,
    respiratoryRate: row.respiratory_rate ?? undefined,
    spo2: row.oxygen_saturation ?? undefined,
    weight: row.weight ?? undefined,
    height: row.height ?? undefined,
    bmi: row.bmi ?? undefined,
    bloodSugarRandom: row.blood_glucose ?? undefined,
    hemoglobin: row.hemoglobin ?? undefined,
    notes: row.notes || undefined,
    recordedAt: row.recorded_at,
  };
}

function toPublicPrescriptionItem(row) {
  return {
    id: row.id,
    medicineId: row.medicine_id || undefined,
    name: row.medicine_name,
    dosage: row.dosage || undefined,
    frequency: row.frequency || undefined,
    duration: row.duration || undefined,
    route: row.route || undefined,
    timing: parseJsonArray(row.timing) || [],
    quantity: row.quantity ?? undefined,
    instructions: row.instructions || undefined,
    instructionsMr: row.instructions_mr || undefined,
    instructionsHi: row.instructions_hi || undefined,
  };
}

function toPublicPrescription(row, items) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name || undefined,
    doctorId: row.doctor_id || undefined,
    doctorName: row.doctor_name || undefined,
    facilityName: row.facility_name || undefined,
    consultationId: row.consultation_id || undefined,
    diagnosis: row.diagnosis || undefined,
    generalAdvice: row.instructions || undefined,
    dietaryInstructions: row.dietary_instructions || undefined,
    followUpDate: row.follow_up_date || undefined,
    status: row.status,
    date: row.issued_at,
    medicines: items ? items.map(toPublicPrescriptionItem) : undefined,
  };
}

function toPublicMedicine(row) {
  return {
    id: row.id,
    name: row.name,
    genericName: row.generic_name || undefined,
    strength: row.strength || undefined,
    dosageForm: row.dosage_form || undefined,
    manufacturer: row.manufacturer || undefined,
    category: row.category || undefined,
    isEssential: !!row.is_essential,
  };
}

// ─── Consultations ──────────────────────────────────────────────────────────

export function getConsultations(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = clinical.listConsultations(req.user, { ...filters, page, limit });
    return sendPaginated(res, items.map(toPublicConsultation), { page, limit, total });
  } catch (err) { next(err); }
}

export function getConsultationById(req, res, next) {
  try {
    const row = clinical.getConsultation(req.user, req.params.id, requestMeta(req));
    return sendSuccess(res, toPublicConsultation(row));
  } catch (err) { next(err); }
}

export function postConsultation(req, res, next) {
  try {
    const row = clinical.createConsultation(req.user, req.body, requestMeta(req));
    return sendSuccess(res, toPublicConsultation(row), 201);
  } catch (err) { next(err); }
}

export function patchConsultation(req, res, next) {
  try {
    const row = clinical.updateConsultation(req.user, req.params.id, req.body, requestMeta(req));
    return sendSuccess(res, toPublicConsultation(row));
  } catch (err) { next(err); }
}

// ─── Vitals ─────────────────────────────────────────────────────────────────

export function getVitals(req, res, next) {
  try {
    const rows = clinical.listVitals(req.user, req.params.id, req.validatedQuery);
    return sendSuccess(res, rows.map(toPublicVitals));
  } catch (err) { next(err); }
}

export function postVitals(req, res, next) {
  try {
    const row = clinical.recordVitals(req.user, req.params.id, req.body, requestMeta(req));
    return sendSuccess(res, toPublicVitals(row), 201);
  } catch (err) { next(err); }
}

// ─── Prescriptions ──────────────────────────────────────────────────────────

export function getPrescriptions(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = clinical.listPrescriptions(req.user, { ...filters, page, limit });
    return sendPaginated(res, items.map((r) => toPublicPrescription(r, r.items)), { page, limit, total });
  } catch (err) { next(err); }
}

export function getPrescriptionById(req, res, next) {
  try {
    const row = clinical.getPrescription(req.user, req.params.id, requestMeta(req));
    return sendSuccess(res, toPublicPrescription(row, row.items));
  } catch (err) { next(err); }
}

export function postPrescription(req, res, next) {
  try {
    const row = clinical.createPrescription(req.user, req.body, requestMeta(req));
    return sendSuccess(res, toPublicPrescription(row, row.items), 201);
  } catch (err) { next(err); }
}

export function patchPrescription(req, res, next) {
  try {
    const row = clinical.updatePrescriptionStatus(req.user, req.params.id, req.body.status, requestMeta(req));
    return sendSuccess(res, toPublicPrescription(row));
  } catch (err) { next(err); }
}

// ─── Medicines ──────────────────────────────────────────────────────────────

export function getMedicines(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = clinical.listMedicines({ ...filters, page, limit });
    return sendPaginated(res, items.map(toPublicMedicine), { page, limit, total });
  } catch (err) { next(err); }
}

export function postMedicine(req, res, next) {
  try {
    const row = clinical.createMedicine(req.user, req.body, requestMeta(req));
    return sendSuccess(res, toPublicMedicine(row), 201);
  } catch (err) { next(err); }
}
