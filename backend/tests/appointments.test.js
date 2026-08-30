import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import {
  resetTestDb, createUser, createPatient, createFacility,
  createAppointment, authCookie, request } from './helpers.js';
import { getDb } from '../src/db/connection.js';

const app = createApp();

let facility, doctor, otherDoctor, asha, admin;
let patientUser, patient, otherPatientUser, otherPatient, ashaPatient;

beforeEach(async () => {
  await resetTestDb();

  facility = createFacility({ name: 'PHC Test' });
  doctor = createUser({ role: 'DOCTOR', name: 'Dr Test', facilityId: facility.id });
  otherDoctor = createUser({ role: 'DOCTOR', name: 'Dr Other' });
  asha = createUser({ role: 'ASHA', name: 'ASHA Test' });
  admin = createUser({ role: 'ADMIN', name: 'Admin Test' });

  patientUser = createUser({ role: 'PATIENT', name: 'Patient One' });
  patient = createPatient({ userId: patientUser.id, name: 'Patient One' });

  otherPatientUser = createUser({ role: 'PATIENT', name: 'Patient Two' });
  otherPatient = createPatient({ userId: otherPatientUser.id, name: 'Patient Two' });

  ashaPatient = createPatient({ name: 'Village Patient', assignedAshaId: asha.id });
});

describe('authorization', () => {
  it('rejects anonymous access', async () => {
    expect((await request(app).get('/api/appointments')).status).toBe(401);
    expect((await request(app).post('/api/appointments').send({})).status).toBe(401);
  });

  it('does not leak another patient\'s appointments in the list', async () => {
    createAppointment({ patientId: otherPatient.id, time: '09:00' });

    const res = await request(app).get('/api/appointments').set('Cookie', authCookie(patientUser));

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  it('returns 404 rather than 403 when reading another patient\'s appointment', async () => {
    const appt = createAppointment({ patientId: otherPatient.id, time: '09:00' });

    const res = await request(app)
      .get(`/api/appointments/${appt.id}`)
      .set('Cookie', authCookie(patientUser));

    // 404 avoids confirming that the id exists.
    expect(res.status).toBe(404);
  });

  it('forbids cancelling another patient\'s appointment', async () => {
    const appt = createAppointment({ patientId: otherPatient.id, time: '09:00' });

    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/cancel`)
      .set('Cookie', authCookie(patientUser));

    expect(res.status).toBe(404);
    const after = getDb().prepare('SELECT status FROM appointments WHERE id = ?').get(appt.id);
    expect(after.status).toBe('BOOKED');
  });

  it('lets an ASHA worker see appointments for their assigned patients', async () => {
    createAppointment({ patientId: ashaPatient.id, time: '11:00' });
    createAppointment({ patientId: otherPatient.id, time: '12:00' });

    const res = await request(app).get('/api/appointments').set('Cookie', authCookie(asha));

    expect(res.body.data.items).toHaveLength(1);
  });

  it('lets a doctor see appointments booked with them', async () => {
    createAppointment({ patientId: patient.id, doctorId: doctor.id, time: '13:00' });
    createAppointment({ patientId: otherPatient.id, doctorId: otherDoctor.id, time: '14:00' });

    const res = await request(app).get('/api/appointments').set('Cookie', authCookie(doctor));

    expect(res.body.data.items).toHaveLength(1);
  });

  it('lets an admin see all appointments', async () => {
    createAppointment({ patientId: patient.id, time: '15:00' });
    createAppointment({ patientId: otherPatient.id, time: '16:00' });

    const res = await request(app).get('/api/appointments').set('Cookie', authCookie(admin));

    expect(res.body.data.items).toHaveLength(2);
  });
});

describe('POST /api/appointments', () => {
  it('books an appointment for the logged-in patient', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Cookie', authCookie(patientUser))
      .send({ date: '2026-12-05', time: '10:30', type: 'in-person', specialty: 'General Medicine', reason: 'Checkup' });

    expect(res.status).toBe(201);
    expect(res.body.data.date).toBe('2026-12-05');
    // The response keeps the frontend's lowercase vocabulary.
    expect(res.body.data.status).toBe('upcoming');
    expect(res.body.data.type).toBe('in-person');
    expect(res.body.data.tokenNumber).toBeGreaterThan(0);

    const stored = getDb().prepare('SELECT * FROM appointments WHERE id = ?').get(res.body.data.id);
    expect(stored.patient_id).toBe(patient.id);
    expect(stored.status).toBe('BOOKED');
  });

  it('rejects an invalid date format', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Cookie', authCookie(patientUser))
      .send({ date: '05-12-2026', time: '10:30' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid time format', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Cookie', authCookie(patientUser))
      .send({ date: '2026-12-05', time: '25:99' });

    expect(res.status).toBe(400);
  });

  it('prevents double-booking the same doctor slot', async () => {
    createAppointment({ patientId: patient.id, doctorId: doctor.id, date: '2026-12-10', time: '09:00' });

    const res = await request(app)
      .post('/api/appointments')
      .set('Cookie', authCookie(otherPatientUser))
      .send({ date: '2026-12-10', time: '09:00', doctor: 'Dr Test' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('allows rebooking a slot that was cancelled', async () => {
    createAppointment({
      patientId: patient.id, doctorId: doctor.id,
      date: '2026-12-11', time: '09:00', status: 'CANCELLED',
    });

    const res = await request(app)
      .post('/api/appointments')
      .set('Cookie', authCookie(otherPatientUser))
      .send({ date: '2026-12-11', time: '09:00', doctor: 'Dr Test' });

    expect(res.status).toBe(201);
  });

  it('stops a patient booking on behalf of an unrelated patient', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Cookie', authCookie(patientUser))
      .send({ patientId: otherPatient.id, date: '2026-12-06', time: '10:00' });

    expect(res.status).toBe(403);
  });

  it('writes an audit entry when booking', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Cookie', authCookie(patientUser))
      .send({ date: '2026-12-07', time: '11:00' });

    const log = getDb()
      .prepare("SELECT * FROM audit_logs WHERE action = 'CREATE_APPOINTMENT' AND entity_id = ?")
      .get(res.body.data.id);
    expect(log).toBeTruthy();
    expect(log.actor_id).toBe(patientUser.id);
  });
});

describe('cancel and reschedule', () => {
  it('cancels an own appointment', async () => {
    const appt = createAppointment({ patientId: patient.id, time: '10:00' });

    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/cancel`)
      .set('Cookie', authCookie(patientUser));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('refuses to cancel twice', async () => {
    const appt = createAppointment({ patientId: patient.id, time: '10:00', status: 'CANCELLED' });

    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/cancel`)
      .set('Cookie', authCookie(patientUser));

    expect(res.status).toBe(409);
  });

  it('reschedules an own appointment', async () => {
    const appt = createAppointment({ patientId: patient.id, date: '2026-12-01', time: '10:00' });

    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/reschedule`)
      .set('Cookie', authCookie(patientUser))
      .send({ date: '2026-12-20', time: '15:30' });

    expect(res.status).toBe(200);
    expect(res.body.data.date).toBe('2026-12-20');
    expect(res.body.data.time).toBe('15:30');
  });

  it('refuses to reschedule into a taken doctor slot', async () => {
    const mine = createAppointment({ patientId: patient.id, doctorId: doctor.id, date: '2026-12-01', time: '10:00' });
    createAppointment({ patientId: otherPatient.id, doctorId: doctor.id, date: '2026-12-02', time: '10:00' });

    const res = await request(app)
      .patch(`/api/appointments/${mine.id}/reschedule`)
      .set('Cookie', authCookie(patientUser))
      .send({ date: '2026-12-02', time: '10:00' });

    expect(res.status).toBe(409);
  });

  it('returns 404 for an unknown appointment', async () => {
    const res = await request(app)
      .patch('/api/appointments/does-not-exist/cancel')
      .set('Cookie', authCookie(patientUser));

    expect(res.status).toBe(404);
  });
});

describe('pagination', () => {
  it('paginates and reports totals', async () => {
    for (let i = 0; i < 25; i++) {
      createAppointment({
        patientId: patient.id,
        date: '2026-12-01',
        time: `${String(8 + Math.floor(i / 6)).padStart(2, '0')}:${String((i % 6) * 10).padStart(2, '0')}`,
      });
    }

    const res = await request(app)
      .get('/api/appointments?page=2&limit=10')
      .set('Cookie', authCookie(patientUser));

    expect(res.body.data.items).toHaveLength(10);
    expect(res.body.data.pagination).toMatchObject({ page: 2, limit: 10, total: 25, totalPages: 3 });
  });

  it('rejects an out-of-range limit', async () => {
    const res = await request(app)
      .get('/api/appointments?limit=5000')
      .set('Cookie', authCookie(patientUser));

    expect(res.status).toBe(400);
  });
});
