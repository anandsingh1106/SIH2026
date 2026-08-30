import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { resetTestDb, createUser, createPatient, createFacility, authCookie, request } from './helpers.js';
import { getDb } from '../src/db/connection.js';
import { calculateCbac, CBAC_THRESHOLD } from '../src/services/cbacService.js';

const app = createApp();

let facility, asha, otherAsha, doctor, admin, patientUser, patient, strangerPatient;

beforeEach(async () => {
  await resetTestDb();

  facility = createFacility({ name: 'PHC Test', district: 'Pune' });
  asha = createUser({ role: 'ASHA', name: 'ASHA One', facilityId: facility.id, district: 'Pune' });
  otherAsha = createUser({ role: 'ASHA', name: 'ASHA Two', district: 'Pune' });
  doctor = createUser({ role: 'DOCTOR', name: 'Dr Test', facilityId: facility.id, district: 'Pune' });
  admin = createUser({ role: 'ADMIN', name: 'Admin' });

  patientUser = createUser({ role: 'PATIENT', name: 'Patient One' });
  patient = createPatient({
    userId: patientUser.id, name: 'Patient One', district: 'Pune',
    assignedAshaId: asha.id,
  });
  strangerPatient = createPatient({ name: 'Stranger', district: 'Nagpur', assignedAshaId: otherAsha.id });

  // date_of_birth drives the CBAC age band.
  getDb().prepare("UPDATE patients SET date_of_birth = '1970-01-01', gender = 'MALE' WHERE id = ?")
    .run(patient.id);
});

describe('CBAC scoring', () => {
  it('scores a low-risk young adult below the threshold', () => {
    const r = calculateCbac({ age: 25, gender: 'MALE', waistCircumference: 80 });
    expect(r.score).toBeLessThan(CBAC_THRESHOLD);
    expect(r.riskCategory).toBe('LOW');
    expect(r.referralRecommended).toBe(false);
  });

  it('accumulates points for age, waist, habits and history', () => {
    const r = calculateCbac({
      age: 62, gender: 'MALE', waistCircumference: 105,
      tobaccoUse: true, alcoholUse: true, familyHistory: true,
      physicalActivityAdequate: false,
    });
    // 4 (age) + 2 (waist) + 1 + 1 + 2 + 1
    expect(r.score).toBe(11);
    expect(r.referralRecommended).toBe(true);
  });

  it('uses sex-specific waist cut-offs', () => {
    const male = calculateCbac({ age: 30, gender: 'MALE', waistCircumference: 85 });
    const female = calculateCbac({ age: 30, gender: 'FEMALE', waistCircumference: 85 });
    expect(female.score).toBeGreaterThan(male.score);
  });

  it('flags suspected hypertension without diagnosing it', () => {
    const r = calculateCbac({ age: 45, gender: 'MALE', bloodPressureSystolic: 150 });
    expect(r.suspectedHypertension).toBe(true);
    expect(r.recommendations.join(' ')).toMatch(/confirmation/i);
    expect(r.disclaimer).toMatch(/does not diagnose/i);
  });

  it('escalates to HIGH for a severely raised reading', () => {
    const r = calculateCbac({ age: 55, gender: 'MALE', bloodPressureSystolic: 165 });
    expect(r.riskCategory).toBe('HIGH');
  });
});

describe('home visits', () => {
  it('lets an ASHA worker record a visit for an assigned patient', async () => {
    const res = await request(app).post('/api/home-visits').set('Cookie', authCookie(asha))
      .send({ patientId: patient.id, visitDate: '2026-08-01', purpose: 'Routine check',
              symptoms: ['cough'], riskLevel: 'LOW' });

    expect(res.status).toBe(201);
    expect(res.body.data.symptoms).toEqual(['cough']);

    const stored = getDb().prepare('SELECT asha_id FROM home_visits WHERE id = ?').get(res.body.data.id);
    expect(stored.asha_id).toBe(asha.id);
  });

  it('blocks a visit for a patient outside the worker\'s area', async () => {
    const res = await request(app).post('/api/home-visits').set('Cookie', authCookie(asha))
      .send({ patientId: strangerPatient.id, visitDate: '2026-08-01' });
    expect(res.status).toBe(404);
  });

  it('forbids a patient from recording home visits', async () => {
    const res = await request(app).post('/api/home-visits').set('Cookie', authCookie(patientUser))
      .send({ patientId: patient.id, visitDate: '2026-08-01' });
    expect(res.status).toBe(403);
  });

  it('escalates a critical finding to clinicians', async () => {
    await request(app).post('/api/home-visits').set('Cookie', authCookie(asha))
      .send({ patientId: patient.id, visitDate: '2026-08-01', riskLevel: 'CRITICAL' });

    const notif = getDb().prepare("SELECT * FROM notifications WHERE type='HOME_VISIT_ALERT'").get();
    expect(notif).toBeTruthy();
    expect(notif.priority).toBe('CRITICAL');
  });

  it('only lists the worker\'s own patients', async () => {
    await request(app).post('/api/home-visits').set('Cookie', authCookie(asha))
      .send({ patientId: patient.id, visitDate: '2026-08-01' });

    const mine = await request(app).get('/api/home-visits').set('Cookie', authCookie(asha));
    expect(mine.body.data.items).toHaveLength(1);

    const theirs = await request(app).get('/api/home-visits').set('Cookie', authCookie(otherAsha));
    expect(theirs.body.data.items).toHaveLength(0);
  });
});

describe('tasks', () => {
  it('creates a self-assigned task by default', async () => {
    const res = await request(app).post('/api/tasks').set('Cookie', authCookie(asha))
      .send({ title: 'Visit household 12', priority: 'HIGH' });

    expect(res.status).toBe(201);
    const stored = getDb().prepare('SELECT assigned_to FROM tasks WHERE id = ?').get(res.body.data.id);
    expect(stored.assigned_to).toBe(asha.id);
  });

  it('notifies the assignee when assigned to someone else', async () => {
    await request(app).post('/api/tasks').set('Cookie', authCookie(doctor))
      .send({ title: 'Follow up', assignedTo: asha.id, priority: 'URGENT' });

    const notif = getDb().prepare("SELECT * FROM notifications WHERE type='TASK' AND user_id=?").get(asha.id);
    expect(notif).toBeTruthy();
  });

  it('shows a worker only their own queue', async () => {
    await request(app).post('/api/tasks').set('Cookie', authCookie(asha)).send({ title: 'Mine' });
    await request(app).post('/api/tasks').set('Cookie', authCookie(otherAsha)).send({ title: 'Theirs' });

    const res = await request(app).get('/api/tasks').set('Cookie', authCookie(asha));
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].title).toBe('Mine');
  });

  it('orders urgent tasks first', async () => {
    await request(app).post('/api/tasks').set('Cookie', authCookie(asha))
      .send({ title: 'Low one', priority: 'LOW' });
    await request(app).post('/api/tasks').set('Cookie', authCookie(asha))
      .send({ title: 'Urgent one', priority: 'URGENT' });

    const res = await request(app).get('/api/tasks').set('Cookie', authCookie(asha));
    expect(res.body.data.items[0].title).toBe('Urgent one');
  });

  it('completes a task and stamps the time', async () => {
    const created = await request(app).post('/api/tasks').set('Cookie', authCookie(asha))
      .send({ title: 'To finish' });

    const res = await request(app).patch(`/api/tasks/${created.body.data.id}`)
      .set('Cookie', authCookie(asha)).send({ status: 'COMPLETED' });

    expect(res.status).toBe(200);
    expect(res.body.data.completedAt).toBeTruthy();
  });

  it('will not let an unrelated worker change a task', async () => {
    const created = await request(app).post('/api/tasks').set('Cookie', authCookie(asha))
      .send({ title: 'Private' });

    const res = await request(app).patch(`/api/tasks/${created.body.data.id}`)
      .set('Cookie', authCookie(otherAsha)).send({ status: 'CANCELLED' });
    expect(res.status).toBe(404);
  });
});

describe('immunization', () => {
  it('schedules and then administers a vaccination', async () => {
    const scheduled = await request(app).post('/api/vaccinations').set('Cookie', authCookie(asha))
      .send({ patientId: patient.id, vaccineName: 'BCG', dose: '1', scheduledDate: '2026-09-01' });
    expect(scheduled.status).toBe(201);
    expect(scheduled.body.data.status).toBe('DUE');

    const given = await request(app)
      .post(`/api/vaccinations/${scheduled.body.data.id}/administer`)
      .set('Cookie', authCookie(asha))
      .send({ administeredDate: '2026-09-02', batchNumber: 'B-123' });

    expect(given.status).toBe(200);
    expect(given.body.data.status).toBe('GIVEN');
    expect(given.body.data.batchNumber).toBe('B-123');
  });

  it('finds vaccinations due before a date', async () => {
    await request(app).post('/api/vaccinations').set('Cookie', authCookie(asha))
      .send({ patientId: patient.id, vaccineName: 'OPV-1', scheduledDate: '2026-09-01' });
    await request(app).post('/api/vaccinations').set('Cookie', authCookie(asha))
      .send({ patientId: patient.id, vaccineName: 'OPV-2', scheduledDate: '2026-12-01' });

    const res = await request(app)
      .get('/api/vaccinations?dueBefore=2026-10-01')
      .set('Cookie', authCookie(asha));
    expect(res.body.data.items).toHaveLength(1);
  });
});

describe('maternal health', () => {
  it('derives EDD from LMP', async () => {
    const res = await request(app).post('/api/maternal-records').set('Cookie', authCookie(asha))
      .send({ patientId: patient.id, lmpDate: '2026-01-01', gravida: 2, parity: 1 });

    expect(res.status).toBe(201);
    // 2026-01-01 + 280 days = 2026-10-08
    expect(res.body.data.eddDate).toBe('2026-10-08');
  });

  it('records an ANC visit and auto-numbers it', async () => {
    const record = await request(app).post('/api/maternal-records').set('Cookie', authCookie(asha))
      .send({ patientId: patient.id, lmpDate: '2026-01-01' });

    const first = await request(app).post(`/api/maternal-records/${record.body.data.id}/anc-visits`)
      .set('Cookie', authCookie(asha)).send({ visitDate: '2026-03-01', weight: 55 });
    expect(first.body.data.visitNumber).toBe(1);

    const second = await request(app).post(`/api/maternal-records/${record.body.data.id}/anc-visits`)
      .set('Cookie', authCookie(asha)).send({ visitDate: '2026-04-01', weight: 57 });
    expect(second.body.data.visitNumber).toBe(2);
  });

  it('flags high risk and alerts on severe anaemia', async () => {
    const record = await request(app).post('/api/maternal-records').set('Cookie', authCookie(asha))
      .send({ patientId: patient.id, lmpDate: '2026-01-01' });

    await request(app).post(`/api/maternal-records/${record.body.data.id}/anc-visits`)
      .set('Cookie', authCookie(asha)).send({ visitDate: '2026-03-01', hemoglobin: 6.1 });

    const stored = getDb().prepare('SELECT high_risk FROM maternal_records WHERE id = ?')
      .get(record.body.data.id);
    expect(stored.high_risk).toBe(1);

    const notif = getDb().prepare("SELECT * FROM notifications WHERE type='MATERNAL_ALERT'").get();
    expect(notif).toBeTruthy();
  });

  it('rejects an out-of-range haemoglobin value', async () => {
    const record = await request(app).post('/api/maternal-records').set('Cookie', authCookie(asha))
      .send({ patientId: patient.id });

    const res = await request(app).post(`/api/maternal-records/${record.body.data.id}/anc-visits`)
      .set('Cookie', authCookie(asha)).send({ visitDate: '2026-03-01', hemoglobin: 99 });
    expect(res.status).toBe(400);
  });
});

describe('NCD screening', () => {
  it('computes and stores the CBAC assessment', async () => {
    const res = await request(app).post('/api/ncd-screenings').set('Cookie', authCookie(asha))
      .send({
        patientId: patient.id, waistCircumference: 102,
        tobaccoUse: true, familyHistory: true, bloodPressureSystolic: 150,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.cbacScore).toBeGreaterThanOrEqual(CBAC_THRESHOLD);
    expect(res.body.data.suspectedHypertension).toBe(true);
    expect(res.body.data.recommendations.length).toBeGreaterThan(0);
    expect(res.body.data.assessment.disclaimer).toMatch(/does not diagnose/i);
  });

  it('alerts clinicians on a high-risk result', async () => {
    await request(app).post('/api/ncd-screenings').set('Cookie', authCookie(asha))
      .send({
        patientId: patient.id, waistCircumference: 110, tobaccoUse: true,
        alcoholUse: true, familyHistory: true, physicalActivityAdequate: false,
        bloodPressureSystolic: 170, bloodGlucose: 260,
      });

    const notif = getDb().prepare("SELECT * FROM notifications WHERE type='NCD_ALERT'").get();
    expect(notif).toBeTruthy();
  });

  it('filters by risk category', async () => {
    await request(app).post('/api/ncd-screenings').set('Cookie', authCookie(asha))
      .send({ patientId: patient.id, waistCircumference: 70 });

    const res = await request(app)
      .get('/api/ncd-screenings?riskCategory=LOW')
      .set('Cookie', authCookie(asha));
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('forbids a patient from recording a screening', async () => {
    const res = await request(app).post('/api/ncd-screenings').set('Cookie', authCookie(patientUser))
      .send({ patientId: patient.id });
    expect(res.status).toBe(403);
  });
});
