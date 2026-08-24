import { getDb } from '../db/connection.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Central patient-access policy, shared by every clinical module so the rules
 * stay consistent (§54 least privilege).
 *
 * Returns:
 *   null      → unrestricted (ADMIN)
 *   string[]  → the exact patient ids this user may touch
 */
export function accessiblePatientIds(user, db = getDb()) {
  switch (user.role) {
    case 'ADMIN':
      return null;

    case 'PATIENT':
      return patientRepository.idsForPatientUser(user.id, db);

    case 'ASHA':
      return patientRepository.idsForAsha(user.id, db);

    case 'DOCTOR':
    case 'SPECIALIST': {
      // Clinicians reach patients they have treated, plus patients registered
      // in their own facility's catchment.
      const treated = db
        .prepare(`
          SELECT DISTINCT patient_id FROM consultations WHERE doctor_id = ?
          UNION
          SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = ?
        `)
        .all(user.id, user.id)
        .map((r) => r.patient_id);

      if (!user.facility_id) return treated;

      const facilityPatients = db
        .prepare(`
          SELECT DISTINCT p.id FROM patients p
          WHERE p.district = (SELECT district FROM facilities WHERE id = ?)
        `)
        .all(user.facility_id)
        .map((r) => r.id);

      return [...new Set([...treated, ...facilityPatients])];
    }

    default:
      return [];
  }
}

export function canAccessPatient(user, patientId, db = getDb()) {
  const scope = accessiblePatientIds(user, db);
  return scope === null || scope.includes(patientId);
}

/**
 * Throws NotFoundError (not Authorization) when access is denied, so callers
 * cannot probe which patient ids exist.
 */
export function assertPatientAccess(user, patientId, db = getDb()) {
  if (!canAccessPatient(user, patientId, db)) {
    throw new NotFoundError('Patient');
  }
}

/** Roles permitted to author clinical records. */
export const CLINICAL_ROLES = ['DOCTOR', 'SPECIALIST'];
export const FIELD_ROLES = ['ASHA', 'DOCTOR', 'SPECIALIST'];
