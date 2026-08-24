import * as patientService from '../services/patientService.js';
import { toPublicPatient } from '../utils/mappers.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

function requestMeta(req) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') };
}

function toPublicAllergy(row) {
  return { id: row.id, substance: row.substance, reaction: row.reaction || undefined,
           severity: row.severity || undefined, recordedAt: row.created_at };
}

function toPublicCondition(row) {
  return { id: row.id, condition: row.condition, diagnosedDate: row.diagnosed_date || undefined,
           status: row.status, notes: row.notes || undefined };
}

function toPublicFamilyMember(row) {
  return {
    id: row.id,
    relatedPatientId: row.related_patient_id || undefined,
    name: row.related_name || row.name || undefined,
    relationship: row.relationship,
    dateOfBirth: row.related_dob || undefined,
    gender: row.related_gender ? String(row.related_gender).toLowerCase() : undefined,
  };
}

export function getPatients(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = patientService.listPatients(req.user, { ...filters, page, limit });
    return sendPaginated(res, items.map(toPublicPatient), { page, limit, total });
  } catch (err) { next(err); }
}

export function getPatientById(req, res, next) {
  try {
    const patient = patientService.getPatient(req.user, req.params.id, requestMeta(req));
    return sendSuccess(res, {
      ...toPublicPatient(patient),
      allergies: patient.allergies.map(toPublicAllergy),
      chronicConditions: patient.chronicConditions.map(toPublicCondition),
      familyMembers: patient.familyMembers.map(toPublicFamilyMember),
    });
  } catch (err) { next(err); }
}

export function postPatient(req, res, next) {
  try {
    const patient = patientService.createPatient(req.user, req.body, requestMeta(req));
    return sendSuccess(res, toPublicPatient(patient), 201);
  } catch (err) { next(err); }
}

export function patchPatient(req, res, next) {
  try {
    const patient = patientService.updatePatient(req.user, req.params.id, req.body, requestMeta(req));
    return sendSuccess(res, toPublicPatient(patient));
  } catch (err) { next(err); }
}

export function postAllergy(req, res, next) {
  try {
    const allergy = patientService.addAllergy(req.user, req.params.id, req.body, requestMeta(req));
    return sendSuccess(res, toPublicAllergy(allergy), 201);
  } catch (err) { next(err); }
}

export function postChronicCondition(req, res, next) {
  try {
    const condition = patientService.addChronicCondition(req.user, req.params.id, req.body, requestMeta(req));
    return sendSuccess(res, toPublicCondition(condition), 201);
  } catch (err) { next(err); }
}

export function getFamilyMembers(req, res, next) {
  try {
    const members = patientService.listFamilyMembers(req.user, req.params.id);
    return sendSuccess(res, members.map(toPublicFamilyMember));
  } catch (err) { next(err); }
}

export function postFamilyMember(req, res, next) {
  try {
    const member = patientService.addFamilyMember(req.user, req.params.id, req.body, requestMeta(req));
    return sendSuccess(res, toPublicFamilyMember(member), 201);
  } catch (err) { next(err); }
}
