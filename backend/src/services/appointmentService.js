import { transaction, getDb } from '../db/connection.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { recordAudit } from './auditService.js';
import { NotFoundError, ConflictError, AuthorizationError, ValidationError } from '../utils/errors.js';
import { apptTypeFromApi } from '../utils/mappers.js';

/**
 * Which patients' appointments a user may see.
 * Returning null means "unrestricted" (admins).
 */
function visiblePatientIds(user, db = getDb()) {
  switch (user.role) {
    case 'ADMIN':
      return null;
    case 'PATIENT':
      return patientRepository.idsForPatientUser(user.id, db);
    case 'ASHA':
      return patientRepository.idsForAsha(user.id, db);
    case 'DOCTOR':
    case 'SPECIALIST':
      // Clinicians see appointments booked with them or at their facility.
      return undefined;
    default:
      return [];
  }
}

export function listAppointments(user, filters = {}) {
  const db = getDb();
  const scope = visiblePatientIds(user, db);

  const query = { ...filters };

  if (scope === null) {
    // Admin: no additional scoping.
  } else if (scope === undefined) {
    // Clinician: restrict to their own bookings or their facility.
    if (!filters.doctorId && !filters.facilityId) {
      query.doctorId = user.id;
    }
  } else {
    query.patientIds = scope;
  }

  return appointmentRepository.list(query, db);
}

/**
 * Doctors and specialists a patient can book with, optionally at one facility.
 * Names and roles only: the booking form needs nothing more.
 */
export function listBookableDoctors({ facilityId } = {}) {
  const db = getDb();
  const where = ["u.role IN ('DOCTOR','SPECIALIST')", "u.status = 'ACTIVE'", 'u.facility_id IS NOT NULL'];
  const params = [];
  if (facilityId) { where.push('u.facility_id = ?'); params.push(facilityId); }
  return db
    .prepare(`
      SELECT u.id, u.name, u.role, u.facility_id, f.name AS facility_name
      FROM users u JOIN facilities f ON f.id = u.facility_id AND f.active = 1
      WHERE ${where.join(' AND ')} ORDER BY u.role, u.name
    `)
    .all(...params)
    .map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      facilityId: r.facility_id,
      facilityName: r.facility_name,
    }));
}

export function getAppointment(user, id) {
  const db = getDb();
  const appointment = appointmentRepository.findById(id, db);
  if (!appointment) throw new NotFoundError('Appointment');

  assertCanAccess(user, appointment, db);
  return appointment;
}

function assertCanAccess(user, appointment, db = getDb()) {
  if (user.role === 'ADMIN') return;

  if (user.role === 'DOCTOR' || user.role === 'SPECIALIST') {
    const sameDoctor = appointment.doctor_id === user.id;
    const sameFacility = user.facility_id && appointment.facility_id === user.facility_id;
    if (sameDoctor || sameFacility) return;
    throw new NotFoundError('Appointment');
  }

  const scope = visiblePatientIds(user, db) || [];
  if (!scope.includes(appointment.patient_id)) {
    // 404 rather than 403 so existence is not leaked to unauthorized callers.
    throw new NotFoundError('Appointment');
  }
}

export function createAppointment(user, input, requestMeta = {}) {
  return transaction((db) => {
    // Resolve which patient the appointment is for.
    let patientId = input.patientId;

    if (user.role === 'PATIENT') {
      const own = patientRepository.ensureForUser(user, db);
      // Patients may only book for themselves or a linked family member.
      if (patientId && patientId !== own.id) {
        const allowed = patientRepository.idsForPatientUser(user.id, db);
        if (!allowed.includes(patientId)) {
          throw new AuthorizationError('You can only book appointments for yourself or a linked family member.');
        }
      } else {
        patientId = own.id;
      }
    } else {
      if (!patientId) {
        throw new ValidationError('patientId is required when booking on behalf of a patient.');
      }
      if (!patientRepository.findById(patientId, db)) {
        throw new NotFoundError('Patient');
      }
    }

    const type = apptTypeFromApi(input.type);

    // An id that matches nothing would store an appointment no clinician ever
    // sees, so both are checked, and the facility follows from the doctor.
    if (input.facilityId &&
        !db.prepare('SELECT 1 FROM facilities WHERE id = ? AND active = 1').get(input.facilityId)) {
      throw new NotFoundError('Facility');
    }
    if (input.doctorId) {
      const doctor = db
        .prepare("SELECT facility_id FROM users WHERE id = ? AND role IN ('DOCTOR','SPECIALIST') AND status = 'ACTIVE'")
        .get(input.doctorId);
      if (!doctor) throw new NotFoundError('Doctor');
      if (input.facilityId && doctor.facility_id && doctor.facility_id !== input.facilityId) {
        throw new ValidationError('That doctor does not work at the selected facility.');
      }
      input = { ...input, facilityId: input.facilityId ?? doctor.facility_id ?? undefined };
    }

    if (input.doctorId &&
        appointmentRepository.isSlotTaken(
          { doctorId: input.doctorId, date: input.date, time: input.time }, db
        )) {
      throw new ConflictError('That doctor already has an appointment at this date and time.');
    }

    const appointment = appointmentRepository.create(
      {
        patientId,
        doctorId: input.doctorId,
        facilityId: input.facilityId,
        specialty: input.specialty,
        date: input.date,
        time: input.time,
        type,
        reason: input.reason,
        tokenNumber: appointmentRepository.nextTokenNumber(
          { facilityId: input.facilityId, date: input.date }, db
        ),
      },
      db
    );

    recordAudit(
      {
        actorId: user.id,
        action: 'CREATE_APPOINTMENT',
        entityType: 'appointment',
        entityId: appointment.id,
        newValues: { patientId, date: input.date, time: input.time, type },
        ...requestMeta,
      },
      db
    );

    return appointment;
  });
}

export function cancelAppointment(user, id, requestMeta = {}) {
  return transaction((db) => {
    const appointment = appointmentRepository.findById(id, db);
    if (!appointment) throw new NotFoundError('Appointment');
    assertCanAccess(user, appointment, db);

    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
      throw new ConflictError(`This appointment is already ${appointment.status.toLowerCase()}.`);
    }

    const updated = appointmentRepository.update(id, { status: 'CANCELLED' }, db);

    recordAudit(
      {
        actorId: user.id,
        action: 'CANCEL_APPOINTMENT',
        entityType: 'appointment',
        entityId: id,
        oldValues: { status: appointment.status },
        newValues: { status: 'CANCELLED' },
        ...requestMeta,
      },
      db
    );

    return updated;
  });
}

export function rescheduleAppointment(user, id, { date, time }, requestMeta = {}) {
  return transaction((db) => {
    const appointment = appointmentRepository.findById(id, db);
    if (!appointment) throw new NotFoundError('Appointment');
    assertCanAccess(user, appointment, db);

    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
      throw new ConflictError(`A ${appointment.status.toLowerCase()} appointment cannot be rescheduled.`);
    }

    if (appointment.doctor_id &&
        appointmentRepository.isSlotTaken(
          { doctorId: appointment.doctor_id, date, time, excludeId: id }, db
        )) {
      throw new ConflictError('That doctor already has an appointment at this date and time.');
    }

    const updated = appointmentRepository.update(id, { date, time }, db);

    recordAudit(
      {
        actorId: user.id,
        action: 'RESCHEDULE_APPOINTMENT',
        entityType: 'appointment',
        entityId: id,
        oldValues: { date: appointment.appointment_date, time: appointment.appointment_time },
        newValues: { date, time },
        ...requestMeta,
      },
      db
    );

    return updated;
  });
}
