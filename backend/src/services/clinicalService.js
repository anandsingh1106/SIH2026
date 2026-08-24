import { getDb, transaction } from '../db/connection.js';
import {
  consultationRepository, vitalsRepository,
  prescriptionRepository, medicineRepository,
} from '../repositories/clinicalRepository.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { accessiblePatientIds, assertPatientAccess, CLINICAL_ROLES, FIELD_ROLES } from './accessControlService.js';
import { recordAudit } from './auditService.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors.js';

function scopeFor(user, db) {
  const scope = accessiblePatientIds(user, db);
  return scope === null ? undefined : scope;
}

// ─── Consultations ──────────────────────────────────────────────────────────

export function listConsultations(user, filters = {}) {
  const db = getDb();
  return consultationRepository.list({ ...filters, patientIds: scopeFor(user, db) }, db);
}

export function getConsultation(user, id, requestMeta = {}) {
  const db = getDb();
  const consultation = consultationRepository.findById(id, db);
  if (!consultation) throw new NotFoundError('Consultation');
  assertPatientAccess(user, consultation.patient_id, db);

  recordAudit(
    { actorId: user.id, action: 'VIEW_CONSULTATION', entityType: 'consultation', entityId: id, ...requestMeta },
    db
  );
  return consultation;
}

export function createConsultation(user, input, requestMeta = {}) {
  if (!CLINICAL_ROLES.includes(user.role)) {
    throw new AuthorizationError('Only doctors and specialists can record consultations.');
  }

  return transaction((db) => {
    if (!patientRepository.findById(input.patientId, db)) throw new NotFoundError('Patient');
    assertPatientAccess(user, input.patientId, db);

    const consultation = consultationRepository.create(
      { ...input, doctorId: user.id, facilityId: input.facilityId ?? user.facility_id },
      db
    );

    recordAudit(
      { actorId: user.id, action: 'CREATE_CONSULTATION', entityType: 'consultation',
        entityId: consultation.id, newValues: { patientId: input.patientId }, ...requestMeta },
      db
    );
    return consultation;
  });
}

export function updateConsultation(user, id, input, requestMeta = {}) {
  return transaction((db) => {
    const existing = consultationRepository.findById(id, db);
    if (!existing) throw new NotFoundError('Consultation');

    // Only the authoring clinician (or an admin) may amend a clinical record.
    if (user.role !== 'ADMIN' && existing.doctor_id !== user.id) {
      throw new AuthorizationError('Only the consulting clinician can amend this record.');
    }

    const updated = consultationRepository.update(id, input, db);
    recordAudit(
      { actorId: user.id, action: 'UPDATE_CONSULTATION', entityType: 'consultation', entityId: id,
        oldValues: { diagnosis: existing.diagnosis, status: existing.status },
        newValues: { diagnosis: updated.diagnosis, status: updated.status }, ...requestMeta },
      db
    );
    return updated;
  });
}

// ─── Vitals ─────────────────────────────────────────────────────────────────

export function listVitals(user, patientId, options = {}) {
  const db = getDb();
  if (!patientRepository.findById(patientId, db)) throw new NotFoundError('Patient');
  assertPatientAccess(user, patientId, db);
  return vitalsRepository.listForPatient(patientId, options, db);
}

export function recordVitals(user, patientId, input, requestMeta = {}) {
  if (!FIELD_ROLES.includes(user.role) && user.role !== 'ADMIN') {
    throw new AuthorizationError('Only clinical staff can record vitals.');
  }

  return transaction((db) => {
    if (!patientRepository.findById(patientId, db)) throw new NotFoundError('Patient');
    assertPatientAccess(user, patientId, db);

    const vitals = vitalsRepository.create(
      { ...input, patientId, recordedBy: user.id, facilityId: input.facilityId ?? user.facility_id },
      db
    );

    recordAudit(
      { actorId: user.id, action: 'RECORD_VITALS', entityType: 'patient', entityId: patientId, ...requestMeta },
      db
    );
    return vitals;
  });
}

// ─── Prescriptions ──────────────────────────────────────────────────────────

export function listPrescriptions(user, filters = {}) {
  const db = getDb();
  return prescriptionRepository.list({ ...filters, patientIds: scopeFor(user, db) }, db);
}

export function getPrescription(user, id, requestMeta = {}) {
  const db = getDb();
  const prescription = prescriptionRepository.findById(id, db);
  if (!prescription) throw new NotFoundError('Prescription');
  assertPatientAccess(user, prescription.patient_id, db);

  recordAudit(
    { actorId: user.id, action: 'VIEW_PRESCRIPTION', entityType: 'prescription', entityId: id, ...requestMeta },
    db
  );

  return { ...prescription, items: prescriptionRepository.listItems(id, db) };
}

export function createPrescription(user, input, requestMeta = {}) {
  if (!CLINICAL_ROLES.includes(user.role)) {
    throw new AuthorizationError('Only doctors and specialists can issue prescriptions.');
  }
  if (!input.items?.length) {
    throw new ValidationError('A prescription must contain at least one medicine.');
  }

  return transaction((db) => {
    if (!patientRepository.findById(input.patientId, db)) throw new NotFoundError('Patient');
    assertPatientAccess(user, input.patientId, db);

    const prescription = prescriptionRepository.create(
      { ...input, doctorId: user.id, facilityId: input.facilityId ?? user.facility_id },
      input.items,
      db
    );

    recordAudit(
      { actorId: user.id, action: 'ISSUE_PRESCRIPTION', entityType: 'prescription',
        entityId: prescription.id,
        newValues: { patientId: input.patientId, itemCount: input.items.length }, ...requestMeta },
      db
    );

    return { ...prescription, items: prescriptionRepository.listItems(prescription.id, db) };
  });
}

export function updatePrescriptionStatus(user, id, status, requestMeta = {}) {
  return transaction((db) => {
    const existing = prescriptionRepository.findById(id, db);
    if (!existing) throw new NotFoundError('Prescription');
    assertPatientAccess(user, existing.patient_id, db);

    if (!CLINICAL_ROLES.includes(user.role) && user.role !== 'ADMIN') {
      throw new AuthorizationError('Only clinical staff can change a prescription status.');
    }

    const updated = prescriptionRepository.updateStatus(id, status, db);
    recordAudit(
      { actorId: user.id, action: 'UPDATE_PRESCRIPTION', entityType: 'prescription', entityId: id,
        oldValues: { status: existing.status }, newValues: { status }, ...requestMeta },
      db
    );
    return updated;
  });
}

// ─── Medicines (formulary) ──────────────────────────────────────────────────

export function listMedicines(filters = {}) {
  return medicineRepository.list(filters, getDb());
}

export function createMedicine(user, input, requestMeta = {}) {
  if (user.role !== 'ADMIN') {
    throw new AuthorizationError('Only administrators can add medicines to the formulary.');
  }
  return transaction((db) => {
    const medicine = medicineRepository.create(input, db);
    recordAudit(
      { actorId: user.id, action: 'CREATE_MEDICINE', entityType: 'medicine', entityId: medicine.id,
        newValues: { name: medicine.name }, ...requestMeta },
      db
    );
    return medicine;
  });
}
