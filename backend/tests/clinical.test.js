import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { resetTestDb, createUser, createPatient, createFacility, authCookie, request } from './helpers.js';
import { getDb } from '../src/db/connection.js';

const app = createApp();

let facility, doctor, otherDoctor, asha, admin, patientUser, patient, otherPatient;

beforeEach(async () => {
  await resetTestDb();

  facility = createFacility({ name: 'PHC Test', district: 'Pune' });
  doctor = createUser({ role: 'DOCTOR', name: 'Dr Test', facilityId: facility.id, district: 'Pune' });
  otherDoctor = createUser({ role: 'DOCTOR', name: 'Dr Other', district: 'Nagpur' });
  asha = createUser({ role: 'ASHA', name: 'ASHA One' });
  admin = createUser({ role: 'ADMIN', name: 'Admin' });

  patientUser = createUser({ role: 'PATIENT', name: 'Patient One' });
  patient = createPatient({ userId: patientUser.id, name: 'Patient One', district: 'Pune', assignedAshaId: asha.id });
  otherPatient = createPatient({ name: 'Patient Two', district: 'Nagpur' });
});

describe('consultations', () => {
  it('lets a doctor record a consultation', async () => {
    const res = await request(app)
      .post('/api/consultations')
      .set('Cookie', authCookie(doctor))
      .send({
        patientId: patient.id,
        chiefComplaint: 'Fever for 3 days',
        symptoms: ['fever', 'headache'],
        diagnosis: 'Viral fever',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.diagnosis).toBe('Viral fever');
    expect(res.body.data.symptoms).toEqual(['fever', 'headache']);
    expect(res.body.data.doctorId).toBe(doctor.id);
  });

  it('forbids a patient from creating a consultation', async () => {
    const res = await request(app)
      .post('/api/consultations')
      .set('Cookie', authCookie(patientUser))
      .send({ patientId: patient.id, diagnosis: 'Self diagnosed' });
    expect(res.status).toBe(403);
  });

  it('forbids an ASHA worker from creating a consultation', async () => {
    const res = await request(app)
      .post('/api/consultations')
      .set('Cookie', authCookie(asha))
      .send({ patientId: patient.id, diagnosis: 'X' });
    expect(res.status).toBe(403);
  });

  it('lets a patient read their own consultation', async () => {
    const created = await request(app).post('/api/consultations').set('Cookie', authCookie(doctor))
      .send({ patientId: patient.id, diagnosis: 'Viral fever' });

    const res = await request(app)
      .get(`/api/consultations/${created.body.data.id}`)
      .set('Cookie', authCookie(patientUser));

    expect(res.status).toBe(200);
    expect(res.body.data.diagnosis).toBe('Viral fever');
  });

  it('hides another patient\'s consultation', async () => {
    const created = await request(app).post('/api/consultations').set('Cookie', authCookie(admin))
      .send({ patientId: otherPatient.id, diagnosis: 'Private' })
      .then((r) => r.body.data);

    // Admin can create; the unrelated patient must not read it.
    const res = await request(app)
      .get(`/api/consultations/${created?.id ?? 'x'}`)
      .set('Cookie', authCookie(patientUser));
    expect([403, 404]).toContain(res.status);
  });

  it('only lets the authoring clinician amend the record', async () => {
    const created = await request(app).post('/api/consultations').set('Cookie', authCookie(doctor))
      .send({ patientId: patient.id, diagnosis: 'Initial' });

    const res = await request(app)
      .patch(`/api/consultations/${created.body.data.id}`)
      .set('Cookie', authCookie(otherDoctor))
      .send({ diagnosis: 'Tampered' });

    expect(res.status).toBe(403);
    const stored = getDb().prepare('SELECT diagnosis FROM consultations WHERE id = ?')
      .get(created.body.data.id);
    expect(stored.diagnosis).toBe('Initial');
  });

  it('lets the author amend and audits it', async () => {
    const created = await request(app).post('/api/consultations').set('Cookie', authCookie(doctor))
      .send({ patientId: patient.id, diagnosis: 'Initial' });

    const res = await request(app)
      .patch(`/api/consultations/${created.body.data.id}`)
      .set('Cookie', authCookie(doctor))
      .send({ diagnosis: 'Refined', status: 'COMPLETED' });

    expect(res.status).toBe(200);
    expect(res.body.data.diagnosis).toBe('Refined');

    const log = getDb().prepare("SELECT * FROM audit_logs WHERE action='UPDATE_CONSULTATION' AND entity_id=?")
      .get(created.body.data.id);
    expect(log).toBeTruthy();
  });
});

describe('vitals', () => {
  it('lets an ASHA worker record vitals for an assigned patient', async () => {
    const res = await request(app)
      .post(`/api/patients/${patient.id}/vitals`)
      .set('Cookie', authCookie(asha))
      .send({ bloodPressureSystolic: 130, bloodPressureDiastolic: 85, heartRate: 78, weight: 70, height: 170 });

    expect(res.status).toBe(201);
    expect(res.body.data.bpSystolic).toBe(130);
    // BMI is derived server-side from weight and height.
    expect(res.body.data.bmi).toBeCloseTo(24.2, 1);
  });

  it('rejects physiologically impossible values', async () => {
    const res = await request(app)
      .post(`/api/patients/${patient.id}/vitals`)
      .set('Cookie', authCookie(asha))
      .send({ heartRate: 5000 });
    expect(res.status).toBe(400);
  });

  it('forbids a patient from recording their own vitals', async () => {
    const res = await request(app)
      .post(`/api/patients/${patient.id}/vitals`)
      .set('Cookie', authCookie(patientUser))
      .send({ heartRate: 60 });
    expect(res.status).toBe(403);
  });

  it('lists vitals newest first', async () => {
    await request(app).post(`/api/patients/${patient.id}/vitals`).set('Cookie', authCookie(doctor))
      .send({ heartRate: 70, recordedAt: '2026-01-01T10:00:00.000Z' });
    await request(app).post(`/api/patients/${patient.id}/vitals`).set('Cookie', authCookie(doctor))
      .send({ heartRate: 80, recordedAt: '2026-06-01T10:00:00.000Z' });

    const res = await request(app)
      .get(`/api/patients/${patient.id}/vitals`)
      .set('Cookie', authCookie(patientUser));

    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].pulse).toBe(80);
  });
});

describe('prescriptions', () => {
  const rxBody = (patientId) => ({
    patientId,
    diagnosis: 'Viral fever',
    instructions: 'Rest and fluids',
    items: [
      { medicineName: 'Paracetamol 500mg', dosage: '1 tablet', frequency: '1-0-1', duration: '5 days', quantity: 10 },
    ],
  });

  it('lets a doctor issue a prescription with items', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Cookie', authCookie(doctor))
      .send(rxBody(patient.id));

    expect(res.status).toBe(201);
    expect(res.body.data.medicines).toHaveLength(1);
    expect(res.body.data.medicines[0].name).toBe('Paracetamol 500mg');
  });

  it('requires at least one medicine', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Cookie', authCookie(doctor))
      .send({ patientId: patient.id, items: [] });
    expect(res.status).toBe(400);
  });

  it('forbids a patient from issuing a prescription', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Cookie', authCookie(patientUser))
      .send(rxBody(patient.id));
    expect(res.status).toBe(403);
  });

  it('forbids an ASHA worker from prescribing', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Cookie', authCookie(asha))
      .send(rxBody(patient.id));
    expect(res.status).toBe(403);
  });

  it('lets the patient read their own prescription', async () => {
    const created = await request(app).post('/api/prescriptions').set('Cookie', authCookie(doctor))
      .send(rxBody(patient.id));

    const res = await request(app)
      .get(`/api/prescriptions/${created.body.data.id}`)
      .set('Cookie', authCookie(patientUser));

    expect(res.status).toBe(200);
    expect(res.body.data.medicines).toHaveLength(1);
  });

  it('rolls back the whole prescription when an item is invalid', async () => {
    const before = getDb().prepare('SELECT COUNT(*) c FROM prescriptions').get().c;

    const res = await request(app)
      .post('/api/prescriptions')
      .set('Cookie', authCookie(doctor))
      .send({
        patientId: patient.id,
        items: [{ medicineName: 'Valid' }, { medicineName: '' }],
      });

    expect(res.status).toBe(400);
    const after = getDb().prepare('SELECT COUNT(*) c FROM prescriptions').get().c;
    expect(after).toBe(before);
  });

  it('audits prescription issuance', async () => {
    const created = await request(app).post('/api/prescriptions').set('Cookie', authCookie(doctor))
      .send(rxBody(patient.id));

    const log = getDb().prepare("SELECT * FROM audit_logs WHERE action='ISSUE_PRESCRIPTION' AND entity_id=?")
      .get(created.body.data.id);
    expect(log).toBeTruthy();
  });
});

describe('medicines formulary', () => {
  it('only lets an admin add a medicine', async () => {
    const denied = await request(app).post('/api/medicines').set('Cookie', authCookie(doctor))
      .send({ name: 'Aspirin' });
    expect(denied.status).toBe(403);

    const allowed = await request(app).post('/api/medicines').set('Cookie', authCookie(admin))
      .send({ name: 'Aspirin', genericName: 'Acetylsalicylic acid', category: 'Analgesic' });
    expect(allowed.status).toBe(201);
  });

  it('searches the formulary', async () => {
    await request(app).post('/api/medicines').set('Cookie', authCookie(admin))
      .send({ name: 'Paracetamol', genericName: 'Acetaminophen' });
    await request(app).post('/api/medicines').set('Cookie', authCookie(admin))
      .send({ name: 'Amoxicillin' });

    const res = await request(app)
      .get('/api/medicines?search=Parac')
      .set('Cookie', authCookie(doctor));

    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].name).toBe('Paracetamol');
  });
});
