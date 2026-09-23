import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { resetTestDb, createUser, createPatient, createFacility, authCookie, request } from './helpers.js';
import { getDb } from '../src/db/connection.js';

const app = createApp();

let asha, patientUser, patient, strangerUser, outsiderDoctor, specialist;

beforeEach(async () => {
  await resetTestDb();
  const nashik = createFacility({ name: 'Nashik Civil', district: 'Nashik' });
  asha = createUser({ role: 'ASHA', name: 'Sunita', phone: '+919800000001' });
  getDb().prepare("UPDATE users SET village = 'Paud' WHERE id = ?").run(asha.id);
  patientUser = createUser({ role: 'PATIENT', name: 'Anandi' });
  patient = createPatient({ userId: patientUser.id, name: 'Anandi', district: 'Pune', assignedAshaId: asha.id });
  strangerUser = createUser({ role: 'PATIENT', name: 'Stranger' });
  createPatient({ userId: strangerUser.id, name: 'Stranger', district: 'Pune' });
  outsiderDoctor = createUser({ role: 'DOCTOR', name: 'Dr Far', facilityId: nashik.id, district: 'Nashik' });
  specialist = createUser({ role: 'SPECIALIST', name: 'Dr Heart', facilityId: nashik.id, district: 'Nashik' });
});

const alert = (user) => request(app).post('/api/notifications/urgent-alert').set('Cookie', authCookie(user))
  .send({ patientId: patient.id, title: 'SOS', message: 'Chest pain at home' });

describe('urgent patient alerts', () => {
  it('lets a patient raise an SOS for themselves and reaches their ASHA', async () => {
    const res = await alert(patientUser);
    expect(res.status).toBe(200);
    expect(res.body.data.notified).toContain('ASHA');
    const note = getDb().prepare("SELECT priority FROM notifications WHERE user_id = ? AND type = 'URGENT_PATIENT_ALERT'").get(asha.id);
    expect(note.priority).toBe('CRITICAL');
  });

  it('refuses senders with no link to the patient', async () => {
    expect((await alert(strangerUser)).status).toBe(404);
    expect((await alert(outsiderDoctor)).status).toBe(404);
    const count = getDb().prepare("SELECT COUNT(*) c FROM notifications WHERE type = 'URGENT_PATIENT_ALERT'").get().c;
    expect(count).toBe(0);
  });

  it('lets the specialist the patient was referred to raise one', async () => {
    const ts = new Date().toISOString();
    getDb().prepare(`
      INSERT INTO referrals (id, referral_code, patient_id, referred_to, urgency, status, created_at, updated_at)
      VALUES (?, 'REF-X', ?, ?, 'URGENT', 'ACCEPTED', ?, ?)
    `).run(crypto.randomUUID(), patient.id, specialist.id, ts, ts);
    expect((await alert(specialist)).status).toBe(200);
  });
});

describe('patient record', () => {
  it('names the assigned ASHA for the emergency card', async () => {
    const res = await request(app).get(`/api/patients/${patient.id}`).set('Cookie', authCookie(patientUser));
    expect(res.body.data.assignedAsha).toEqual({ name: 'Sunita', phone: '+919800000001', village: 'Paud' });
  });
});
