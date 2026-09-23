import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { resetTestDb, createUser, createFacility, authCookie, request } from './helpers.js';
import { getDb } from '../src/db/connection.js';

const app = createApp();

let admin, doctor, facility;

function addBed(facilityId, type = 'GENERAL', status = 'AVAILABLE') {
  const ts = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO beds (id, facility_id, bed_number, type, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), facilityId, `B-${crypto.randomUUID().slice(0, 6)}`, type, status, ts, ts);
}

beforeEach(async () => {
  await resetTestDb();
  facility = createFacility({ name: 'PHC Paud', district: 'Pune' });
  admin = createUser({ role: 'ADMIN', name: 'Admin' });
  doctor = createUser({ role: 'DOCTOR', name: 'Dr Test', facilityId: facility.id });
});

const valid = {
  name: 'Primary Health Centre Pirangut',
  type: 'PHC',
  district: 'Pune',
  taluka: 'Mulshi',
  phone: '020-22923011',
  emergencyAvailable: true,
};

describe('facility registry', () => {
  it('is admin only', async () => {
    expect((await request(app).get('/api/facilities').set('Cookie', authCookie(doctor))).status).toBe(403);
    expect((await request(app).post('/api/facilities').set('Cookie', authCookie(doctor)).send(valid)).status).toBe(403);
  });

  it('lists facilities with live bed and staff counts', async () => {
    addBed(facility.id, 'GENERAL', 'AVAILABLE');
    addBed(facility.id, 'GENERAL', 'OCCUPIED');
    addBed(facility.id, 'ICU', 'AVAILABLE');

    const res = await request(app).get('/api/facilities').set('Cookie', authCookie(admin));
    expect(res.status).toBe(200);
    const row = res.body.data.items.find((f) => f.id === facility.id);
    expect(row.beds).toMatchObject({ total: 3, available: 2, icuTotal: 1, icuAvailable: 1 });
    expect(row.doctors).toBe(1);
    expect(row.active).toBe(true);
  });

  it('registers a facility and audits it', async () => {
    const res = await request(app).post('/api/facilities').set('Cookie', authCookie(admin)).send(valid);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: valid.name, type: 'PHC', taluka: 'Mulshi', emergencyAvailable: true });

    const audit = getDb().prepare("SELECT * FROM audit_logs WHERE action = 'CREATE_FACILITY'").get();
    expect(audit.entity_id).toBe(res.body.data.id);

    // It also appears in the public directory straight away.
    const pub = await request(app).get('/api/public/facilities?search=Pirangut');
    expect(pub.body.data.items).toHaveLength(1);
  });

  it('rejects a duplicate name in the same district', async () => {
    await request(app).post('/api/facilities').set('Cookie', authCookie(admin)).send(valid);
    const again = await request(app).post('/api/facilities').set('Cookie', authCookie(admin)).send(valid);
    expect(again.status).toBe(409);
  });

  it('rejects an unknown facility type', async () => {
    const res = await request(app).post('/api/facilities').set('Cookie', authCookie(admin))
      .send({ ...valid, type: 'CLINIC' });
    expect(res.status).toBe(400);
  });

  it('edits a facility and hides it once deactivated', async () => {
    const edit = await request(app).patch(`/api/facilities/${facility.id}`).set('Cookie', authCookie(admin))
      .send({ phone: '020-11112222', emergencyAvailable: true });
    expect(edit.status).toBe(200);
    expect(edit.body.data).toMatchObject({ phone: '020-11112222', emergencyAvailable: true });

    const closed = await request(app).patch(`/api/facilities/${facility.id}`).set('Cookie', authCookie(admin))
      .send({ active: false });
    expect(closed.body.data.active).toBe(false);

    const active = await request(app).get('/api/facilities').set('Cookie', authCookie(admin));
    expect(active.body.data.items.some((f) => f.id === facility.id)).toBe(false);

    const all = await request(app).get('/api/facilities?includeInactive=true').set('Cookie', authCookie(admin));
    expect(all.body.data.items.some((f) => f.id === facility.id)).toBe(true);

    const onlyActive = await request(app).get('/api/facilities?includeInactive=false').set('Cookie', authCookie(admin));
    expect(onlyActive.body.data.items.some((f) => f.id === facility.id)).toBe(false);
  });

  it('returns 404 for an unknown facility', async () => {
    const res = await request(app).patch('/api/facilities/missing').set('Cookie', authCookie(admin))
      .send({ phone: '020-11112222' });
    expect(res.status).toBe(404);
  });
});
