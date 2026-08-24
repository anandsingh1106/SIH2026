import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetTestDb, createUser, createPatient, createFacility, authCookie } from './helpers.js';
import { getDb } from '../src/db/connection.js';

const app = createApp();

let facility, doctor, asha, otherAsha, admin;
let patientUser, ownPatient, ashaPatient, strangerPatient;

beforeEach(async () => {
  await resetTestDb();

  facility = createFacility({ name: 'PHC Test', district: 'Pune' });
  doctor = createUser({ role: 'DOCTOR', name: 'Dr Test', facilityId: facility.id, district: 'Pune' });
  asha = createUser({ role: 'ASHA', name: 'ASHA One' });
  otherAsha = createUser({ role: 'ASHA', name: 'ASHA Two' });
  admin = createUser({ role: 'ADMIN', name: 'Admin' });

  patientUser = createUser({ role: 'PATIENT', name: 'Self Patient' });
  ownPatient = createPatient({ userId: patientUser.id, name: 'Self Patient', district: 'Pune' });
  ashaPatient = createPatient({ name: 'Village Patient', assignedAshaId: asha.id, district: 'Pune' });
  strangerPatient = createPatient({ name: 'Stranger', assignedAshaId: otherAsha.id, district: 'Nagpur' });
});

describe('GET /api/patients', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/patients')).status).toBe(401);
  });

  it('shows a patient only their own record', async () => {
    const res = await request(app).get('/api/patients').set('Cookie', authCookie(patientUser));
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].id).toBe(ownPatient.id);
  });

  it('shows an ASHA worker only their assigned patients', async () => {
    const res = await request(app).get('/api/patients').set('Cookie', authCookie(asha));
    const ids = res.body.data.items.map((p) => p.id);
    expect(ids).toContain(ashaPatient.id);
    expect(ids).not.toContain(strangerPatient.id);
  });

  it('shows an admin every patient', async () => {
    const res = await request(app).get('/api/patients').set('Cookie', authCookie(admin));
    expect(res.body.data.pagination.total).toBe(3);
  });

  it('supports search', async () => {
    const res = await request(app)
      .get('/api/patients?search=Village')
      .set('Cookie', authCookie(admin));
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].name).toBe('Village Patient');
  });

  it('supports district filtering', async () => {
    const res = await request(app)
      .get('/api/patients?district=Nagpur')
      .set('Cookie', authCookie(admin));
    expect(res.body.data.items).toHaveLength(1);
  });
});

describe('GET /api/patients/:id', () => {
  it('returns 404 for a patient outside the caller\'s scope', async () => {
    const res = await request(app)
      .get(`/api/patients/${strangerPatient.id}`)
      .set('Cookie', authCookie(patientUser));
    expect(res.status).toBe(404);
  });

  it('returns the record with clinical sub-collections', async () => {
    const res = await request(app)
      .get(`/api/patients/${ownPatient.id}`)
      .set('Cookie', authCookie(patientUser));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ownPatient.id);
    expect(res.body.data).toHaveProperty('allergies');
    expect(res.body.data).toHaveProperty('chronicConditions');
    expect(res.body.data).toHaveProperty('familyMembers');
  });

  it('audits every record view', async () => {
    await request(app).get(`/api/patients/${ownPatient.id}`).set('Cookie', authCookie(patientUser));

    const log = getDb()
      .prepare("SELECT * FROM audit_logs WHERE action='VIEW_PATIENT_RECORD' AND entity_id=?")
      .get(ownPatient.id);
    expect(log).toBeTruthy();
    expect(log.actor_id).toBe(patientUser.id);
  });
});

describe('POST /api/patients', () => {
  it('forbids a patient from registering other patients', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Cookie', authCookie(patientUser))
      .send({ name: 'New Person' });
    expect(res.status).toBe(403);
  });

  it('lets an ASHA worker register a patient and auto-assigns them', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Cookie', authCookie(asha))
      .send({ name: 'Newly Registered', district: 'Pune', gender: 'FEMALE' });

    expect(res.status).toBe(201);
    const stored = getDb().prepare('SELECT * FROM patients WHERE id = ?').get(res.body.data.id);
    expect(stored.assigned_asha_id).toBe(asha.id);
  });

  it('rejects a duplicate ABHA id', async () => {
    await request(app).post('/api/patients').set('Cookie', authCookie(asha))
      .send({ name: 'First', abhaId: '91-1111-2222-3333' });

    const res = await request(app).post('/api/patients').set('Cookie', authCookie(asha))
      .send({ name: 'Second', abhaId: '91-1111-2222-3333' });

    expect(res.status).toBe(409);
  });

  it('validates required fields', async () => {
    const res = await request(app).post('/api/patients').set('Cookie', authCookie(asha)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('allergies and chronic conditions', () => {
  it('records an allergy', async () => {
    const res = await request(app)
      .post(`/api/patients/${ashaPatient.id}/allergies`)
      .set('Cookie', authCookie(asha))
      .send({ substance: 'Penicillin', severity: 'SEVERE' });

    expect(res.status).toBe(201);
    expect(res.body.data.substance).toBe('Penicillin');
  });

  it('rejects an invalid severity', async () => {
    const res = await request(app)
      .post(`/api/patients/${ashaPatient.id}/allergies`)
      .set('Cookie', authCookie(asha))
      .send({ substance: 'X', severity: 'EXTREME' });
    expect(res.status).toBe(400);
  });

  it('forbids a patient from writing their own clinical records', async () => {
    const res = await request(app)
      .post(`/api/patients/${ownPatient.id}/allergies`)
      .set('Cookie', authCookie(patientUser))
      .send({ substance: 'Peanuts' });
    expect(res.status).toBe(403);
  });

  it('records a chronic condition', async () => {
    const res = await request(app)
      .post(`/api/patients/${ashaPatient.id}/chronic-conditions`)
      .set('Cookie', authCookie(asha))
      .send({ condition: 'Type 2 Diabetes', status: 'ACTIVE' });
    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/patients/:id', () => {
  it('lets a patient update their own contact details', async () => {
    const res = await request(app)
      .patch(`/api/patients/${ownPatient.id}`)
      .set('Cookie', authCookie(patientUser))
      .send({ phone: '+919876500000' });
    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe('+919876500000');
  });

  it('stops a patient reassigning their ASHA worker', async () => {
    const res = await request(app)
      .patch(`/api/patients/${ownPatient.id}`)
      .set('Cookie', authCookie(patientUser))
      .send({ assignedAshaId: otherAsha.id });
    expect(res.status).toBe(403);
  });
});

describe('family members', () => {
  it('links and lists a family member', async () => {
    const post = await request(app)
      .post(`/api/patients/${ownPatient.id}/family`)
      .set('Cookie', authCookie(patientUser))
      .send({ relatedPatientId: ashaPatient.id, relationship: 'Sibling' });
    expect(post.status).toBe(201);

    const list = await request(app)
      .get(`/api/patients/${ownPatient.id}/family`)
      .set('Cookie', authCookie(patientUser));
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].relationship).toBe('Sibling');
  });

  it('rejects linking a non-existent patient', async () => {
    const res = await request(app)
      .post(`/api/patients/${ownPatient.id}/family`)
      .set('Cookie', authCookie(patientUser))
      .send({ relatedPatientId: 'nope', relationship: 'Cousin' });
    expect(res.status).toBe(404);
  });
});
