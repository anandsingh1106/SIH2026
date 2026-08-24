import { getDb, transaction } from '../db/connection.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { accessiblePatientIds, assertPatientAccess, FIELD_ROLES } from './accessControlService.js';
import { recordAudit } from './auditService.js';
import { NotFoundError, AuthorizationError, ConflictError } from '../utils/errors.js';

export function listPatients(user, filters = {}) {
  const db = getDb();
  const scope = accessiblePatientIds(user, db);
  return patientRepository.list({ ...filters, patientIds: scope ?? undefined }, db);
}

/**
 * Reading a patient record is itself a sensitive action and is audited (§23).
 */
export function getPatient(user, id, requestMeta = {}) {
  const db = getDb();
  const patient = patientRepository.findById(id, db);
  if (!patient) throw new NotFoundError('Patient');
  assertPatientAccess(user, id, db);

  recordAudit(
    { actorId: user.id, action: 'VIEW_PATIENT_RECORD', entityType: 'patient', entityId: id, ...requestMeta },
    db
  );

  return {
    ...patient,
    allergies: patientRepository.listAllergies(id, db),
    chronicConditions: patientRepository.listChronicConditions(id, db),
    familyMembers: patientRepository.listFamilyMembers(id, db),
  };
}

export function createPatient(user, input, requestMeta = {}) {
  if (!FIELD_ROLES.includes(user.role) && user.role !== 'ADMIN') {
    throw new AuthorizationError('Only ASHA workers, doctors and administrators can register patients.');
  }

  return transaction((db) => {
    if (input.abhaId) {
      const existing = db.prepare('SELECT id FROM patients WHERE abha_id = ?').get(input.abhaId);
      if (existing) throw new ConflictError('A patient with this ABHA ID is already registered.');
    }

    // ASHA workers implicitly own the patients they register.
    const assignedAshaId = input.assignedAshaId ?? (user.role === 'ASHA' ? user.id : null);

    const patient = patientRepository.create({ ...input, assignedAshaId }, db);

    recordAudit(
      {
        actorId: user.id, action: 'CREATE_PATIENT', entityType: 'patient', entityId: patient.id,
        newValues: { name: patient.name, district: patient.district }, ...requestMeta,
      },
      db
    );

    return patient;
  });
}

export function updatePatient(user, id, input, requestMeta = {}) {
  return transaction((db) => {
    const existing = patientRepository.findById(id, db);
    if (!existing) throw new NotFoundError('Patient');
    assertPatientAccess(user, id, db);

    // Patients may correct their own contact details but not clinical ownership.
    if (user.role === 'PATIENT') {
      const forbidden = ['assignedAshaId', 'abhaId'];
      for (const field of forbidden) {
        if (input[field] !== undefined) {
          throw new AuthorizationError(`You cannot change ${field}.`);
        }
      }
    }

    const updated = patientRepository.update(id, input, db);

    recordAudit(
      {
        actorId: user.id, action: 'UPDATE_PATIENT', entityType: 'patient', entityId: id,
        oldValues: { name: existing.name, phone: existing.phone },
        newValues: { name: updated.name, phone: updated.phone }, ...requestMeta,
      },
      db
    );

    return updated;
  });
}

export function addAllergy(user, patientId, input, requestMeta = {}) {
  return transaction((db) => {
    if (!patientRepository.findById(patientId, db)) throw new NotFoundError('Patient');
    assertPatientAccess(user, patientId, db);
    if (!FIELD_ROLES.includes(user.role) && user.role !== 'ADMIN') {
      throw new AuthorizationError('Only clinical staff can record allergies.');
    }

    const allergy = patientRepository.addAllergy(patientId, { ...input, recordedBy: user.id }, db);
    recordAudit(
      { actorId: user.id, action: 'ADD_ALLERGY', entityType: 'patient', entityId: patientId,
        newValues: { substance: input.substance }, ...requestMeta },
      db
    );
    return allergy;
  });
}

export function addChronicCondition(user, patientId, input, requestMeta = {}) {
  return transaction((db) => {
    if (!patientRepository.findById(patientId, db)) throw new NotFoundError('Patient');
    assertPatientAccess(user, patientId, db);
    if (!FIELD_ROLES.includes(user.role) && user.role !== 'ADMIN') {
      throw new AuthorizationError('Only clinical staff can record chronic conditions.');
    }

    const condition = patientRepository.addChronicCondition(patientId, { ...input, recordedBy: user.id }, db);
    recordAudit(
      { actorId: user.id, action: 'ADD_CHRONIC_CONDITION', entityType: 'patient', entityId: patientId,
        newValues: { condition: input.condition }, ...requestMeta },
      db
    );
    return condition;
  });
}

export function listFamilyMembers(user, patientId) {
  const db = getDb();
  if (!patientRepository.findById(patientId, db)) throw new NotFoundError('Patient');
  assertPatientAccess(user, patientId, db);
  return patientRepository.listFamilyMembers(patientId, db);
}

export function addFamilyMember(user, patientId, input, requestMeta = {}) {
  return transaction((db) => {
    if (!patientRepository.findById(patientId, db)) throw new NotFoundError('Patient');
    assertPatientAccess(user, patientId, db);

    if (input.relatedPatientId && !patientRepository.findById(input.relatedPatientId, db)) {
      throw new NotFoundError('Related patient');
    }

    const member = patientRepository.addFamilyMember(patientId, input, db);
    recordAudit(
      { actorId: user.id, action: 'ADD_FAMILY_MEMBER', entityType: 'patient', entityId: patientId, ...requestMeta },
      db
    );
    return member;
  });
}
