import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { resetTestDb, createUser, createPatient, createFacility, authCookie, request } from './helpers.js';
import { getDb } from '../src/db/connection.js';

const app = createApp();

let facility, specialist, doctor, outsider, asha, admin, patientUser, patient, farPatient;

function createReferral(patientId, referredTo) {
  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO referrals (id, referral_code, patient_id, referred_to, urgency, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'URGENT', 'ACCEPTED', ?, ?)
  `).run(id, `REF-${id.slice(0, 6)}`, patientId, referredTo, ts, ts);
  return id;
}

beforeEach(async () => {
  await resetTestDb();
  facility = createFacility({ name: 'Sassoon', district: 'Pune' });
  const nashik = createFacility({ name: 'Nashik Civil', district: 'Nashik' });
  specialist = createUser({ role: 'SPECIALIST', name: 'Dr Specialist', facilityId: facility.id });
  doctor = createUser({ role: 'DOCTOR', name: 'Dr PHC', facilityId: facility.id });
  outsider = createUser({ role: 'DOCTOR', name: 'Dr Elsewhere', facilityId: nashik.id, district: 'Nashik' });
  asha = createUser({ role: 'ASHA', name: 'ASHA One' });
  admin = createUser({ role: 'ADMIN', name: 'Admin' });
  patientUser = createUser({ role: 'PATIENT', name: 'Anandi Patil' });
  patient = createPatient({ userId: patientUser.id, name: 'Anandi Patil', district: 'Pune', assignedAshaId: asha.id });
  farPatient = createPatient({ name: 'Far Away', district: 'Satara' });
});

const plan = (overrides = {}) => ({
  patientId: patient.id,
  title: 'Uncontrolled hypertension with early nephropathy',
  specialty: 'Cardiology',
  directives: 'Salt below 3 g a day. ASHA to check for ankle swelling.',
  phases: [
    { title: 'Baseline renal workup', description: 'Creatinine and urine albumin', targetDate: '2026-10-01' },
    { title: 'Switch to telmisartan 40 mg', targetDate: '2026-10-08' },
  ],
  ...overrides,
});

async function createPlan(user = specialist, body = plan()) {
  return request(app).post('/api/treatment-plans').set('Cookie', authCookie(user)).send(body);
}

describe('treatment plans', () => {
  it('lets a specialist write a plan with ordered phases', async () => {
    const res = await createPlan();
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      patientName: 'Anandi Patil', status: 'ACTIVE', authorName: 'Dr Specialist',
    });
    expect(res.body.data.phases.map((p) => p.title)).toEqual(['Baseline renal workup', 'Switch to telmisartan 40 mg']);
    expect(res.body.data.phases.every((p) => p.completed === false)).toBe(true);
  });

  it('tells the patient\'s ASHA about a new plan', async () => {
    await createPlan();
    const note = getDb().prepare("SELECT * FROM notifications WHERE user_id = ? AND type = 'TREATMENT_PLAN'").get(asha.id);
    expect(note.title).toContain('Anandi Patil');
  });

  it('refuses authors who are not clinicians', async () => {
    expect((await createPlan(asha)).status).toBe(403);
    expect((await createPlan(admin)).status).toBe(403);
  });

  it('refuses a patient the clinician cannot reach, unless referred to them', async () => {
    expect((await createPlan(specialist, plan({ patientId: farPatient.id }))).status).toBe(404);

    createReferral(farPatient.id, specialist.id);
    expect((await createPlan(specialist, plan({ patientId: farPatient.id }))).status).toBe(201);
  });

  it('needs at least one phase', async () => {
    expect((await createPlan(specialist, plan({ phases: [] }))).status).toBe(400);
  });

  it('marks phases done and records who did it', async () => {
    const created = (await createPlan()).body.data;
    const phaseId = created.phases[0].id;

    // The PHC doctor carrying the plan out ticks the phase off.
    const res = await request(app)
      .patch(`/api/treatment-plans/${created.id}/phases/${phaseId}`)
      .set('Cookie', authCookie(doctor))
      .send({ completed: true });
    expect(res.status).toBe(200);
    expect(res.body.data.phases[0].completed).toBe(true);

    const row = getDb().prepare('SELECT completed_by FROM treatment_plan_phases WHERE id = ?').get(phaseId);
    expect(row.completed_by).toBe(doctor.id);

    const undo = await request(app)
      .patch(`/api/treatment-plans/${created.id}/phases/${phaseId}`)
      .set('Cookie', authCookie(doctor))
      .send({ completed: false });
    expect(undo.body.data.phases[0].completed).toBe(false);
  });

  it('only lets the author change the plan itself', async () => {
    const created = (await createPlan()).body.data;
    const byDoctor = await request(app).patch(`/api/treatment-plans/${created.id}`)
      .set('Cookie', authCookie(doctor)).send({ status: 'COMPLETED' });
    expect(byDoctor.status).toBe(403);

    const byAuthor = await request(app).patch(`/api/treatment-plans/${created.id}`)
      .set('Cookie', authCookie(specialist)).send({ status: 'REVIEW_REQUIRED' });
    expect(byAuthor.body.data.status).toBe('REVIEW_REQUIRED');
  });

  it('locks the phases of a closed plan', async () => {
    const created = (await createPlan()).body.data;
    await request(app).patch(`/api/treatment-plans/${created.id}`)
      .set('Cookie', authCookie(specialist)).send({ status: 'COMPLETED' });

    const res = await request(app)
      .patch(`/api/treatment-plans/${created.id}/phases/${created.phases[0].id}`)
      .set('Cookie', authCookie(specialist))
      .send({ completed: true });
    expect(res.status).toBe(400);
  });

  it('shows a plan to the patient and their ASHA, but not to an unrelated doctor', async () => {
    const created = (await createPlan()).body.data;

    for (const user of [patientUser, asha, admin]) {
      const list = await request(app).get('/api/treatment-plans').set('Cookie', authCookie(user));
      expect(list.body.data.items.map((p) => p.id)).toContain(created.id);
    }

    const list = await request(app).get('/api/treatment-plans').set('Cookie', authCookie(outsider));
    expect(list.body.data.items).toHaveLength(0);
    const one = await request(app).get(`/api/treatment-plans/${created.id}`).set('Cookie', authCookie(outsider));
    expect(one.status).toBe(404);
  });

  it('filters to the plans the caller wrote', async () => {
    await createPlan();
    await createPlan(doctor);

    const mine = await request(app).get('/api/treatment-plans?mine=true').set('Cookie', authCookie(specialist));
    expect(mine.body.data.items).toHaveLength(1);
    const all = await request(app).get('/api/treatment-plans?mine=false').set('Cookie', authCookie(specialist));
    expect(all.body.data.items).toHaveLength(2);
  });
});
