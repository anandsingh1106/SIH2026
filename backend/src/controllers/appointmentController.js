import {
  listAppointments,
  getAppointment,
  createAppointment,
  cancelAppointment,
  rescheduleAppointment,
} from '../services/appointmentService.js';
import { getDb } from '../db/connection.js';
import { toPublicAppointment } from '../utils/mappers.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

function requestMeta(req) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') };
}

/**
 * The existing frontend posts `doctor` and `facility` as display names rather
 * than ids. Resolve those to real rows when they match, so appointments link up
 * properly without breaking the current client (§56).
 */
function resolveNamedReferences(body) {
  const db = getDb();
  const resolved = { ...body };

  if (!resolved.facilityId && body.facility) {
    const facility = db.prepare('SELECT id FROM facilities WHERE name = ?').get(body.facility);
    if (facility) resolved.facilityId = facility.id;
  }

  if (!resolved.doctorId && body.doctor) {
    const doctor = db
      .prepare("SELECT id FROM users WHERE name = ? AND role IN ('DOCTOR','SPECIALIST')")
      .get(body.doctor);
    if (doctor) resolved.doctorId = doctor.id;
  }

  return resolved;
}

export function getAppointments(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = listAppointments(req.user, { ...filters, page, limit });
    return sendPaginated(res, items.map(toPublicAppointment), { page, limit, total });
  } catch (err) {
    next(err);
  }
}

export function getAppointmentById(req, res, next) {
  try {
    const appointment = getAppointment(req.user, req.params.id);
    return sendSuccess(res, toPublicAppointment(appointment));
  } catch (err) {
    next(err);
  }
}

export function postAppointment(req, res, next) {
  try {
    const input = resolveNamedReferences(req.body);
    const appointment = createAppointment(req.user, input, requestMeta(req));

    // Keep the client's free-text names in the response when they did not
    // resolve to database rows.
    const shaped = toPublicAppointment(appointment);
    if (!shaped.doctor && req.body.doctor) shaped.doctor = req.body.doctor;
    if (!shaped.facility && req.body.facility) shaped.facility = req.body.facility;

    return sendSuccess(res, shaped, 201);
  } catch (err) {
    next(err);
  }
}

export function patchCancel(req, res, next) {
  try {
    const appointment = cancelAppointment(req.user, req.params.id, requestMeta(req));
    return sendSuccess(res, toPublicAppointment(appointment));
  } catch (err) {
    next(err);
  }
}

export function patchReschedule(req, res, next) {
  try {
    const appointment = rescheduleAppointment(req.user, req.params.id, req.body, requestMeta(req));
    return sendSuccess(res, toPublicAppointment(appointment));
  } catch (err) {
    next(err);
  }
}
