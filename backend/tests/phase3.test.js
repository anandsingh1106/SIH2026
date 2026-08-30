import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { resetTestDb, createUser, createPatient, createFacility, authCookie, request } from './helpers.js';
import { getDb } from '../src/db/connection.js';
import { allocateBed } from '../src/services/bedService.js';

const app = createApp();

let phc, hospital, doctor, specialist, otherSpecialist, asha, admin;
let patientUser, patient, otherPatient;

function createBed(overrides = {}) {
  const db = getDb();
  const id = overrides.id || `bed-${crypto.randomUUID()}`;
  const ts = new Date().toISOString();
  db.prepare(`
    INSERT INTO beds (id, facility_id, ward, bed_number, type, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, overrides.facilityId, overrides.ward ?? 'Ward A',
         overrides.bedNumber || `B-${Math.floor(Math.random() * 10000)}`,
         overrides.type || 'GENERAL', overrides.status || 'AVAILABLE', ts, ts);
  return db.prepare('SELECT * FROM beds WHERE id = ?').get(id);
}

beforeEach(async () => {
  await resetTestDb();

  phc = createFacility({ name: 'PHC Source', type: 'PHC', district: 'Pune' });
  hospital = createFacility({ name: 'District Hospital', type: 'DISTRICT_HOSPITAL', district: 'Pune' });

  doctor = createUser({ role: 'DOCTOR', name: 'Dr Source', facilityId: phc.id, district: 'Pune' });
  specialist = createUser({ role: 'SPECIALIST', name: 'Dr Spec', facilityId: hospital.id, district: 'Pune' });
  otherSpecialist = createUser({ role: 'SPECIALIST', name: 'Dr Other', district: 'Nagpur' });
  asha = createUser({ role: 'ASHA', name: 'ASHA One' });
  admin = createUser({ role: 'ADMIN', name: 'Admin' });

  patientUser = createUser({ role: 'PATIENT', name: 'Patient One' });
  patient = createPatient({ userId: patientUser.id, name: 'Patient One', district: 'Pune', assignedAshaId: asha.id });
  otherPatient = createPatient({ name: 'Patient Two', district: 'Nagpur' });
});

describe('referral lifecycle', () => {
  const refBody = (patientId, destId) => ({
    patientId,
    destinationFacilityId: destId,
    specialty: 'Cardiology',
    reason: 'Chest pain',
    urgency: 'URGENT',
    clinicalSummary: 'Patient reports chest pain on exertion.',
  });

  it('creates a referral with a generated code and timeline', async () => {
    const res = await request(app).post('/api/referrals').set('Cookie', authCookie(doctor))
      .send(refBody(patient.id, hospital.id));

    expect(res.status).toBe(201);
    expect(res.body.data.referralCode).toMatch(/^REF-/);
    expect(res.body.data.status).toBe('SENT');
    // CREATED then SENT are both recorded.
    expect(res.body.data.history).toHaveLength(2);
  });

  it('notifies the destination facility', async () => {
    await request(app).post('/api/referrals').set('Cookie', authCookie(doctor))
      .send(refBody(patient.id, hospital.id));

    const notif = getDb()
      .prepare("SELECT * FROM notifications WHERE type='REFERRAL' AND facility_id=?")
      .get(hospital.id);
    expect(notif).toBeTruthy();
  });

  it('forbids a patient from creating a referral', async () => {
    const res = await request(app).post('/api/referrals').set('Cookie', authCookie(patientUser))
      .send(refBody(patient.id, hospital.id));
    expect(res.status).toBe(403);
  });

  it('walks the full happy path SENT -> ACCEPTED -> ARRIVED -> IN_CONSULTATION -> COMPLETED', async () => {
    const created = await request(app).post('/api/referrals').set('Cookie', authCookie(doctor))
      .send(refBody(patient.id, hospital.id));
    const id = created.body.data.id;
    const cookie = authCookie(specialist);

    expect((await request(app).post(`/api/referrals/${id}/accept`).set('Cookie', cookie).send({})).status).toBe(200);
    expect((await request(app).post(`/api/referrals/${id}/arrive`).set('Cookie', cookie).send({})).status).toBe(200);

    const consult = await request(app).patch(`/api/referrals/${id}`).set('Cookie', cookie)
      .send({ status: 'IN_CONSULTATION' });
    expect(consult.status).toBe(200);

    const done = await request(app).post(`/api/referrals/${id}/complete`).set('Cookie', cookie).send({});
    expect(done.status).toBe(200);
    expect(done.body.data.status).toBe('COMPLETED');
    expect(done.body.data.completedAt).toBeTruthy();
    // Every transition is on the timeline.
    expect(done.body.data.history.length).toBeGreaterThanOrEqual(6);
  });

  it('rejects an illegal transition', async () => {
    const created = await request(app).post('/api/referrals').set('Cookie', authCookie(doctor))
      .send(refBody(patient.id, hospital.id));

    // SENT cannot jump straight to COMPLETED.
    const res = await request(app)
      .post(`/api/referrals/${created.body.data.id}/complete`)
      .set('Cookie', authCookie(specialist)).send({});

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('does not let a rejected referral continue', async () => {
    const created = await request(app).post('/api/referrals').set('Cookie', authCookie(doctor))
      .send(refBody(patient.id, hospital.id));
    const id = created.body.data.id;

    await request(app).post(`/api/referrals/${id}/reject`).set('Cookie', authCookie(specialist)).send({});
    const res = await request(app).post(`/api/referrals/${id}/accept`).set('Cookie', authCookie(specialist)).send({});
    expect(res.status).toBe(409);
  });

  it('stops a specialist at another facility from accepting', async () => {
    const created = await request(app).post('/api/referrals').set('Cookie', authCookie(doctor))
      .send(refBody(patient.id, hospital.id));

    const res = await request(app)
      .post(`/api/referrals/${created.body.data.id}/accept`)
      .set('Cookie', authCookie(otherSpecialist)).send({});

    expect([403, 404]).toContain(res.status);
  });

  it('shows a specialist their facility inbound queue', async () => {
    await request(app).post('/api/referrals').set('Cookie', authCookie(doctor))
      .send(refBody(patient.id, hospital.id));

    const res = await request(app).get('/api/referrals').set('Cookie', authCookie(specialist));
    expect(res.body.data.items).toHaveLength(1);
  });

  it('orders emergency referrals first', async () => {
    await request(app).post('/api/referrals').set('Cookie', authCookie(doctor))
      .send({ ...refBody(patient.id, hospital.id), urgency: 'ROUTINE' });
    await request(app).post('/api/referrals').set('Cookie', authCookie(doctor))
      .send({ ...refBody(patient.id, hospital.id), urgency: 'EMERGENCY' });

    const res = await request(app).get('/api/referrals').set('Cookie', authCookie(specialist));
    expect(res.body.data.items[0].urgency).toBe('EMERGENCY');
  });
});

describe('bed management', () => {
  it('allocates a bed and marks it occupied', async () => {
    const bed = createBed({ facilityId: hospital.id, type: 'ICU' });

    const res = await request(app)
      .post(`/api/beds/${bed.id}/allocate`)
      .set('Cookie', authCookie(specialist))
      .send({ patientId: patient.id });

    expect(res.status).toBe(201);
    const stored = getDb().prepare('SELECT status FROM beds WHERE id = ?').get(bed.id);
    expect(stored.status).toBe('OCCUPIED');
  });

  it('refuses to double-allocate a bed', async () => {
    const bed = createBed({ facilityId: hospital.id });
    await request(app).post(`/api/beds/${bed.id}/allocate`).set('Cookie', authCookie(specialist))
      .send({ patientId: patient.id });

    const res = await request(app).post(`/api/beds/${bed.id}/allocate`).set('Cookie', authCookie(specialist))
      .send({ patientId: otherPatient.id });

    expect(res.status).toBe(409);
  });

  it('keeps exactly one allocation when two allocations race', () => {
    const bed = createBed({ facilityId: hospital.id });

    // Simulates concurrent staff actions: both call the service directly.
    const results = [patient.id, otherPatient.id].map((pid) => {
      try {
        allocateBed(specialist, bed.id, { patientId: pid });
        return 'ok';
      } catch {
        return 'rejected';
      }
    });

    expect(results.filter((r) => r === 'ok')).toHaveLength(1);
    const live = getDb()
      .prepare('SELECT COUNT(*) c FROM bed_allocations WHERE bed_id = ? AND released_at IS NULL')
      .get(bed.id).c;
    expect(live).toBe(1);
  });

  it('releases a bed and makes it available again', async () => {
    const bed = createBed({ facilityId: hospital.id });
    await request(app).post(`/api/beds/${bed.id}/allocate`).set('Cookie', authCookie(specialist))
      .send({ patientId: patient.id });

    const res = await request(app).post(`/api/beds/${bed.id}/release`).set('Cookie', authCookie(specialist));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('AVAILABLE');

    // The bed can now be allocated to someone else.
    const again = await request(app).post(`/api/beds/${bed.id}/allocate`).set('Cookie', authCookie(specialist))
      .send({ patientId: otherPatient.id });
    expect(again.status).toBe(201);
  });

  it('forbids a patient from allocating beds', async () => {
    const bed = createBed({ facilityId: hospital.id });
    const res = await request(app).post(`/api/beds/${bed.id}/allocate`).set('Cookie', authCookie(patientUser))
      .send({ patientId: patient.id });
    expect(res.status).toBe(403);
  });

  it('reports aggregate availability', async () => {
    createBed({ facilityId: hospital.id, type: 'ICU', bedNumber: 'ICU-1' });
    createBed({ facilityId: hospital.id, type: 'ICU', bedNumber: 'ICU-2' });
    createBed({ facilityId: hospital.id, type: 'GENERAL', bedNumber: 'G-1' });

    const res = await request(app)
      .get(`/api/beds/availability?facilityId=${hospital.id}`)
      .set('Cookie', authCookie(specialist));

    const icu = res.body.data.find((r) => r.type === 'ICU');
    expect(icu.total).toBe(2);
    expect(icu.available).toBe(2);
  });

  it('will not set a bed to OCCUPIED directly', async () => {
    const bed = createBed({ facilityId: hospital.id });
    const res = await request(app).patch(`/api/beds/${bed.id}/status`).set('Cookie', authCookie(specialist))
      .send({ status: 'OCCUPIED' });
    expect(res.status).toBe(400);
  });
});

describe('lab orders', () => {
  it('lets a doctor order a test', async () => {
    const res = await request(app).post('/api/lab-orders').set('Cookie', authCookie(doctor))
      .send({ patientId: patient.id, testName: 'Complete Blood Count', category: 'Pathology' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ORDERED');
  });

  it('forbids an ASHA worker from ordering tests', async () => {
    const res = await request(app).post('/api/lab-orders').set('Cookie', authCookie(asha))
      .send({ patientId: patient.id, testName: 'CBC' });
    expect(res.status).toBe(403);
  });

  it('enforces the status flow', async () => {
    const created = await request(app).post('/api/lab-orders').set('Cookie', authCookie(doctor))
      .send({ patientId: patient.id, testName: 'CBC' });
    const id = created.body.data.id;

    // ORDERED cannot jump straight to COMPLETED.
    const bad = await request(app).patch(`/api/lab-orders/${id}`).set('Cookie', authCookie(doctor))
      .send({ status: 'COMPLETED' });
    expect(bad.status).toBe(409);

    const good = await request(app).patch(`/api/lab-orders/${id}`).set('Cookie', authCookie(doctor))
      .send({ status: 'SAMPLE_COLLECTED' });
    expect(good.status).toBe(200);
  });

  it('records a result, completes the order and alerts the doctor', async () => {
    const created = await request(app).post('/api/lab-orders').set('Cookie', authCookie(doctor))
      .send({ patientId: patient.id, testName: 'Hemoglobin' });
    const id = created.body.data.id;

    const res = await request(app).post(`/api/lab-orders/${id}/results`).set('Cookie', authCookie(doctor))
      .send({ result: '8.2', unit: 'g/dL', referenceRange: '13-17', abnormalFlag: 'CRITICAL' });

    expect(res.status).toBe(201);

    const order = getDb().prepare('SELECT status FROM lab_orders WHERE id = ?').get(id);
    expect(order.status).toBe('COMPLETED');

    const notif = getDb()
      .prepare("SELECT * FROM notifications WHERE type='LAB_RESULT' AND user_id=?")
      .get(doctor.id);
    expect(notif).toBeTruthy();
    expect(notif.priority).toBe('CRITICAL');
  });

  it('lets the patient read their own lab order', async () => {
    const created = await request(app).post('/api/lab-orders').set('Cookie', authCookie(doctor))
      .send({ patientId: patient.id, testName: 'CBC' });

    const res = await request(app).get(`/api/lab-orders/${created.body.data.id}`)
      .set('Cookie', authCookie(patientUser));
    expect(res.status).toBe(200);
  });
});

describe('notifications', () => {
  it('lists notifications addressed to the user', async () => {
    await request(app).post('/api/referrals').set('Cookie', authCookie(doctor))
      .send({ patientId: patient.id, destinationFacilityId: hospital.id, urgency: 'ROUTINE' });

    const res = await request(app).get('/api/notifications').set('Cookie', authCookie(specialist));
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('does not leak another facility\'s notifications', async () => {
    await request(app).post('/api/referrals').set('Cookie', authCookie(doctor))
      .send({ patientId: patient.id, destinationFacilityId: hospital.id, urgency: 'ROUTINE' });

    const res = await request(app).get('/api/notifications').set('Cookie', authCookie(otherSpecialist));
    expect(res.body.data.items).toHaveLength(0);
  });

  it('marks one and then all as read', async () => {
    await request(app).post('/api/referrals').set('Cookie', authCookie(doctor))
      .send({ patientId: patient.id, destinationFacilityId: hospital.id, urgency: 'ROUTINE' });

    const list = await request(app).get('/api/notifications').set('Cookie', authCookie(specialist));
    const first = list.body.data.items[0];

    const read = await request(app).patch(`/api/notifications/${first.id}/read`).set('Cookie', authCookie(specialist));
    expect(read.status).toBe(200);
    expect(read.body.data.isRead).toBe(true);

    const all = await request(app).post('/api/notifications/read-all').set('Cookie', authCookie(specialist));
    expect(all.status).toBe(200);

    const count = await request(app).get('/api/notifications/unread-count').set('Cookie', authCookie(specialist));
    expect(count.body.data.unread).toBe(0);
  });
});
