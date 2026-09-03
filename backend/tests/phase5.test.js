import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { resetTestDb, createUser, createPatient, createFacility, authCookie, request } from './helpers.js';
import { getDb } from '../src/db/connection.js';
import { adjustStock } from '../src/services/inventoryService.js';
import { checkInteractions } from '../src/services/ai/drugInteractionService.js';
import { assessTriage } from '../src/services/ai/triageService.js';
import { ensureDemoQueueForToday } from '../src/db/demoQueue.js';

const app = createApp();

let facility, otherFacility, admin, doctor, asha, patientUser, patient, medicine;

function createMedicine(name = 'Paracetamol 500mg') {
  const db = getDb();
  const id = `med-${crypto.randomUUID()}`;
  const ts = new Date().toISOString();
  db.prepare(`
    INSERT INTO medicines (id, name, generic_name, active, is_essential, created_at, updated_at)
    VALUES (?, ?, ?, 1, 1, ?, ?)
  `).run(id, name, name.split(' ')[0], ts, ts);
  return db.prepare('SELECT * FROM medicines WHERE id = ?').get(id);
}

beforeEach(async () => {
  await resetTestDb();
  facility = createFacility({ name: 'PHC Test', district: 'Pune' });
  otherFacility = createFacility({ name: 'CHC Test', district: 'Pune' });
  admin = createUser({ role: 'ADMIN', name: 'Admin' });
  doctor = createUser({ role: 'DOCTOR', name: 'Dr Test', facilityId: facility.id, district: 'Pune' });
  asha = createUser({ role: 'ASHA', name: 'ASHA One', facilityId: facility.id, district: 'Pune' });
  patientUser = createUser({ role: 'PATIENT', name: 'Patient One' });
  patient = createPatient({ userId: patientUser.id, name: 'Patient One', district: 'Pune', assignedAshaId: asha.id });
  medicine = createMedicine();
});

describe('inventory', () => {
  async function stockItem(quantity = 100, reorderLevel = 10) {
    const res = await request(app).post('/api/inventory').set('Cookie', authCookie(admin))
      .send({ medicineId: medicine.id, facilityId: facility.id, quantity, reorderLevel, batchNumber: 'B1' });
    return res.body.data;
  }

  it('creates stock and records the opening transaction', async () => {
    const item = await stockItem(50);
    expect(item.stock).toBe(50);

    const tx = getDb().prepare("SELECT * FROM inventory_transactions WHERE inventory_id = ? AND type='STOCK_IN'").get(item.id);
    expect(tx.quantity_after).toBe(50);
  });

  it('never allows stock to go negative', async () => {
    const item = await stockItem(10);

    const res = await request(app).post(`/api/inventory/${item.id}/adjust`).set('Cookie', authCookie(admin))
      .send({ type: 'STOCK_OUT', quantity: 25 });

    expect(res.status).toBe(409);
    const after = getDb().prepare('SELECT quantity FROM inventory WHERE id = ?').get(item.id);
    expect(after.quantity).toBe(10);
  });

  it('keeps the balance correct when two stock-outs race', async () => {
    const item = await stockItem(10);

    const outcomes = [8, 8].map((qty) => {
      try { adjustStock(admin, item.id, { type: 'STOCK_OUT', quantity: qty }); return 'ok'; }
      catch { return 'rejected'; }
    });

    expect(outcomes.filter((o) => o === 'ok')).toHaveLength(1);
    const after = getDb().prepare('SELECT quantity FROM inventory WHERE id = ?').get(item.id);
    expect(after.quantity).toBe(2);
  });

  it('raises a low-stock alert when crossing the reorder level', async () => {
    const item = await stockItem(20, 10);
    await request(app).post(`/api/inventory/${item.id}/adjust`).set('Cookie', authCookie(admin))
      .send({ type: 'STOCK_OUT', quantity: 12 });

    const notif = getDb().prepare("SELECT * FROM notifications WHERE type='LOW_STOCK'").get();
    expect(notif).toBeTruthy();
  });

  it('transfers stock atomically between facilities', async () => {
    const item = await stockItem(100);

    const res = await request(app).post('/api/inventory/transfer').set('Cookie', authCookie(admin))
      .send({ medicineId: medicine.id, fromFacilityId: facility.id, toFacilityId: otherFacility.id, quantity: 30 });

    expect(res.status).toBe(201);

    const source = getDb().prepare('SELECT quantity FROM inventory WHERE id = ?').get(item.id);
    expect(source.quantity).toBe(70);

    const dest = getDb().prepare('SELECT quantity FROM inventory WHERE facility_id = ? AND medicine_id = ?')
      .get(otherFacility.id, medicine.id);
    expect(dest.quantity).toBe(30);
  });

  it('refuses a transfer larger than available stock', async () => {
    await stockItem(10);
    const res = await request(app).post('/api/inventory/transfer').set('Cookie', authCookie(admin))
      .send({ medicineId: medicine.id, fromFacilityId: facility.id, toFacilityId: otherFacility.id, quantity: 50 });
    expect(res.status).toBe(409);
  });

  it('forbids an ASHA worker from changing stock', async () => {
    const item = await stockItem(10);
    const res = await request(app).post(`/api/inventory/${item.id}/adjust`).set('Cookie', authCookie(asha))
      .send({ type: 'STOCK_OUT', quantity: 1 });
    expect(res.status).toBe(403);
  });
});

describe('offline sync', () => {
  const operation = (overrides = {}) => ({
    operationId: overrides.operationId || crypto.randomUUID(),
    entity: 'home_visit',
    action: 'CREATE',
    payload: { patientId: patient.id, visitDate: '2026-08-01', purpose: 'Offline visit' },
    clientTimestamp: '2026-08-01T10:00:00.000Z',
    ...overrides,
  });

  it('processes a batch and returns server ids', async () => {
    const res = await request(app).post('/api/sync/batch').set('Cookie', authCookie(asha))
      .send({ operations: [operation(), operation()] });

    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(2);
    expect(res.body.data.results.every((r) => r.success)).toBe(true);
    expect(res.body.data.results[0].serverId).toBeTruthy();
  });

  it('is idempotent — replaying a batch creates no duplicates', async () => {
    const op = operation();

    const first = await request(app).post('/api/sync/batch').set('Cookie', authCookie(asha))
      .send({ operations: [op] });
    const serverId = first.body.data.results[0].serverId;

    const replay = await request(app).post('/api/sync/batch').set('Cookie', authCookie(asha))
      .send({ operations: [op] });

    expect(replay.body.data.results[0].success).toBe(true);
    expect(replay.body.data.results[0].duplicate).toBe(true);
    expect(replay.body.data.results[0].serverId).toBe(serverId);

    const count = getDb().prepare('SELECT COUNT(*) c FROM home_visits').get().c;
    expect(count).toBe(1);
  });

  it('isolates failures so the rest of the batch still applies', async () => {
    const good = operation();
    const bad = operation({ payload: { patientId: 'does-not-exist', visitDate: '2026-08-01' } });

    const res = await request(app).post('/api/sync/batch').set('Cookie', authCookie(asha))
      .send({ operations: [bad, good] });

    const results = res.body.data.results;
    expect(results.find((r) => r.operationId === bad.operationId).success).toBe(false);
    expect(results.find((r) => r.operationId === good.operationId).success).toBe(true);

    expect(getDb().prepare('SELECT COUNT(*) c FROM home_visits').get().c).toBe(1);
  });

  it('rejects an unsupported entity', async () => {
    const res = await request(app).post('/api/sync/batch').set('Cookie', authCookie(asha))
      .send({ operations: [operation({ entity: 'nuclear_launch' })] });

    expect(res.body.data.results[0].success).toBe(false);
    expect(res.body.data.results[0].error).toMatch(/Unsupported/i);
  });

  it('repairs risk levels queued by older clients', async () => {
    // Earlier app versions queued the display text rather than the enum value,
    // which reached the database and failed as a CHECK constraint violation.
    const res = await request(app).post('/api/sync/batch').set('Cookie', authCookie(asha))
      .send({
        operations: [operation({
          payload: {
            patientId: patient.id,
            visitDate: '2026-08-01',
            riskLevel: 'High Risk Identified',
          },
        })],
      });

    expect(res.body.data.results[0].success).toBe(true);
    const stored = getDb().prepare('SELECT risk_level FROM home_visits ORDER BY created_at DESC').get();
    expect(stored.risk_level).toBe('HIGH');
  });

  it('maps the legacy "Normal" outcome to LOW', async () => {
    const res = await request(app).post('/api/sync/batch').set('Cookie', authCookie(asha))
      .send({
        operations: [operation({
          payload: { patientId: patient.id, visitDate: '2026-08-02', riskLevel: 'Normal' },
        })],
      });

    expect(res.body.data.results[0].success).toBe(true);
    const stored = getDb().prepare('SELECT risk_level FROM home_visits ORDER BY created_at DESC').get();
    expect(stored.risk_level).toBe('LOW');
  });

  it('reports a readable validation error rather than a raw constraint failure', async () => {
    const res = await request(app).post('/api/sync/batch').set('Cookie', authCookie(asha))
      .send({
        operations: [operation({ payload: { visitDate: 'not-a-date' } })],
      });

    const { success, error } = res.body.data.results[0];
    expect(success).toBe(false);
    expect(error).toMatch(/visitDate|patientId/);
    // The database's own wording must never reach the field worker.
    expect(error).not.toMatch(/CHECK constraint/i);
  });

  it('accepts display-only fields carried alongside the payload', async () => {
    // Queued records include patientName so the offline log is readable.
    const res = await request(app).post('/api/sync/batch').set('Cookie', authCookie(asha))
      .send({
        operations: [operation({
          payload: {
            patientId: patient.id,
            visitDate: '2026-08-03',
            patientName: 'Display Only',
            householdId: 'HV-TEST-999',
          },
        })],
      });

    expect(res.body.data.results[0].success).toBe(true);
  });

  it('enforces authorization inside sync just like the REST route', async () => {
    // A patient may not create home visits, even via the sync channel.
    const res = await request(app).post('/api/sync/batch').set('Cookie', authCookie(patientUser))
      .send({ operations: [operation()] });

    expect(res.body.data.results[0].success).toBe(false);
    expect(getDb().prepare('SELECT COUNT(*) c FROM home_visits').get().c).toBe(0);
  });
});

describe('OPD queue', () => {
  it('issues sequential token numbers', async () => {
    const other = createPatient({ name: 'Second', district: 'Pune' });

    const first = await request(app).post('/api/queue/token').set('Cookie', authCookie(doctor))
      .send({ facilityId: facility.id, patientId: patient.id });
    const second = await request(app).post('/api/queue/token').set('Cookie', authCookie(doctor))
      .send({ facilityId: facility.id, patientId: other.id });

    expect(first.body.data.tokenNumber).toBe(1);
    expect(second.body.data.tokenNumber).toBe(2);
  });

  it('refuses a duplicate active token for the same patient', async () => {
    await request(app).post('/api/queue/token').set('Cookie', authCookie(doctor))
      .send({ facilityId: facility.id, patientId: patient.id });

    const res = await request(app).post('/api/queue/token').set('Cookie', authCookie(doctor))
      .send({ facilityId: facility.id, patientId: patient.id });
    expect(res.status).toBe(409);
  });

  it('reports queue position', async () => {
    const other = createPatient({ name: 'Second', district: 'Pune' });
    await request(app).post('/api/queue/token').set('Cookie', authCookie(doctor))
      .send({ facilityId: facility.id, patientId: patient.id });
    const second = await request(app).post('/api/queue/token').set('Cookie', authCookie(doctor))
      .send({ facilityId: facility.id, patientId: other.id });

    const res = await request(app).get(`/api/queue/token/${second.body.data.id}`)
      .set('Cookie', authCookie(doctor));
    expect(res.body.data.position).toBe(2);
  });

  it('walks the queue lifecycle', async () => {
    const token = await request(app).post('/api/queue/token').set('Cookie', authCookie(doctor))
      .send({ facilityId: facility.id, patientId: patient.id });
    const id = token.body.data.id;
    const cookie = authCookie(doctor);

    expect((await request(app).post(`/api/queue/${id}/call`).set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).post(`/api/queue/${id}/start`).set('Cookie', cookie)).status).toBe(200);
    const done = await request(app).post(`/api/queue/${id}/complete`).set('Cookie', cookie);
    expect(done.body.data.status).toBe('COMPLETED');
  });

  it('drops a completed token out of the waiting list on the queue view', async () => {
    const cookie = authCookie(doctor);
    const token = await request(app).post('/api/queue/token').set('Cookie', cookie)
      .send({ facilityId: facility.id, patientId: patient.id });
    const id = token.body.data.id;

    const before = await request(app).get(`/api/queue/${facility.id}`).set('Cookie', cookie);
    const waitingBefore = before.body.data.summary.waiting;

    // The consultation screen closes the token once the prescription is signed.
    await request(app).post(`/api/queue/${id}/call`).set('Cookie', cookie);
    await request(app).post(`/api/queue/${id}/start`).set('Cookie', cookie);
    await request(app).post(`/api/queue/${id}/complete`).set('Cookie', cookie);

    const after = await request(app).get(`/api/queue/${facility.id}`).set('Cookie', cookie);
    // The desk read stale "In Consultation" rows while nothing closed the token.
    expect(after.body.data.items.find((t) => t.id === id).status).toBe('COMPLETED');
    expect(after.body.data.summary.waiting).toBe(waitingBefore - 1);
    expect(after.body.data.summary.currentToken).toBeNull();
  });

  it('re-seeds the demo OPD queue for whatever day it is opened on', async () => {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    // The seeder only ever acts on the seeded demo accounts.
    createUser({
      role: 'DOCTOR', name: 'Demo Doctor', facilityId: facility.id,
      email: 'demo.doctor@arogyasetu.test',
    });

    const first = ensureDemoQueueForToday({ silent: true });
    expect(first.seeded).toBeGreaterThan(0);

    // Running again must not stack a second queue on the same day.
    expect(ensureDemoQueueForToday({ silent: true }).seeded).toBe(0);
    const sameDay = db.prepare('SELECT COUNT(*) AS c FROM opd_tokens WHERE queue_date = ?').get(today).c;
    expect(sameDay).toBe(first.seeded);

    // Yesterday's tokens leave today empty, which is what stranded the demo.
    db.prepare('DELETE FROM opd_tokens WHERE queue_date = ?').run(today);
    expect(ensureDemoQueueForToday({ silent: true }).seeded).toBe(first.seeded);
  });

  it('leaves a non-demo deployment queue alone', () => {
    // No demo.* doctor exists in this suite by default.
    expect(ensureDemoQueueForToday({ silent: true }).seeded).toBe(0);
  });

  it('rejects an illegal queue transition', async () => {
    const token = await request(app).post('/api/queue/token').set('Cookie', authCookie(doctor))
      .send({ facilityId: facility.id, patientId: patient.id });

    // WAITING cannot go straight to IN_PROGRESS.
    const res = await request(app).post(`/api/queue/${token.body.data.id}/start`)
      .set('Cookie', authCookie(doctor));
    expect(res.status).toBe(409);
  });
});

describe('AI services', () => {
  it('flags emergency symptoms deterministically', async () => {
    const r = await assessTriage({ symptoms: ['severe chest pain', 'sweating'] });
    expect(r.riskCategory).toBe('EMERGENCY');
    expect(r.recommendedAction).toMatch(/108/);
    expect(r.disclaimer).toMatch(/not a diagnosis/i);
  });

  it('escalates on critical vitals even without symptoms', async () => {
    const r = await assessTriage({ symptoms: [], vitals: { oxygenSaturation: 85 } });
    expect(r.riskCategory).toBe('EMERGENCY');
  });

  it('returns routine for an unremarkable presentation', async () => {
    const r = await assessTriage({ symptoms: ['mild sore throat'], vitals: { heartRate: 76 } });
    expect(r.riskCategory).toBe('ROUTINE');
  });

  it('never recommends medication', async () => {
    const r = await assessTriage({ symptoms: ['fever', 'headache'] });
    expect(r.disclaimer).toMatch(/does not recommend or prescribe/i);
    expect(JSON.stringify(r)).not.toMatch(/\bmg\b/);
  });

  it('works through the API', async () => {
    const res = await request(app).post('/api/ai/triage').set('Cookie', authCookie(asha))
      .send({ symptoms: ['difficulty breathing'], vitals: { oxygenSaturation: 88 } });

    expect(res.status).toBe(200);
    expect(res.body.data.riskCategory).toBe('EMERGENCY');
    // With no provider key configured the deterministic result still stands.
    expect(res.body.data.aiAssisted).toBe(false);
  });

  it('finds a documented drug interaction', () => {
    const r = checkInteractions(['Tab Warfarin 5mg', 'Tab Aspirin 75mg']);
    expect(r.interactions).toHaveLength(1);
    expect(r.severity).toBe('HIGH');
  });

  it('does not invent an interaction for unknown pairs', () => {
    const r = checkInteractions(['Vitamin C', 'Zinc']);
    expect(r.interactions).toHaveLength(0);
    expect(r.recommendation).toMatch(/does not guarantee/i);
  });

  it('checks interactions through the API', async () => {
    const res = await request(app).post('/api/ai/drug-interactions').set('Cookie', authCookie(doctor))
      .send({ medicines: ['warfarin', 'ibuprofen'] });
    expect(res.body.data.severity).toBe('HIGH');
  });
});

describe('analytics', () => {
  it('gives a patient only their own counts', async () => {
    const res = await request(app).get('/api/analytics/patient').set('Cookie', authCookie(patientUser));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('appointments');
  });

  it('restricts admin analytics to administrators', async () => {
    expect((await request(app).get('/api/analytics/admin').set('Cookie', authCookie(doctor))).status).toBe(403);
    expect((await request(app).get('/api/analytics/admin').set('Cookie', authCookie(admin))).status).toBe(200);
  });

  it('returns aggregated heatmap data without patient identifiers', async () => {
    const res = await request(app).get('/api/analytics/heatmap?metric=patients')
      .set('Cookie', authCookie(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.points.every((p) => typeof p.value === 'number')).toBe(true);
    expect(JSON.stringify(res.body.data)).not.toMatch(/Patient One/);
  });

  it('restricts heatmaps to administrators', async () => {
    const res = await request(app).get('/api/analytics/heatmap').set('Cookie', authCookie(asha));
    expect(res.status).toBe(403);
  });
});

describe('audit logs', () => {
  it('is admin-only', async () => {
    expect((await request(app).get('/api/audit-logs').set('Cookie', authCookie(doctor))).status).toBe(403);
    expect((await request(app).get('/api/audit-logs').set('Cookie', authCookie(admin))).status).toBe(200);
  });
});

describe('public endpoints', () => {
  it('lists facilities without authentication', async () => {
    const res = await request(app).get('/api/public/facilities');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('exposes no patient data', async () => {
    const res = await request(app).get('/api/public/facilities');
    expect(JSON.stringify(res.body)).not.toMatch(/Patient One/);
  });

  it('serves emergency helplines', async () => {
    const res = await request(app).get('/api/public/emergency');
    expect(res.body.data.helplines.some((h) => h.number === '108')).toBe(true);
  });
});

describe('messaging', () => {
  it('creates a conversation and exchanges a message', async () => {
    const conv = await request(app).post('/api/conversations').set('Cookie', authCookie(doctor))
      .send({ subject: 'Case discussion', memberIds: [asha.id] });
    expect(conv.status).toBe(201);

    const sent = await request(app).post(`/api/conversations/${conv.body.data.id}/messages`)
      .set('Cookie', authCookie(doctor)).send({ body: 'Please follow up with this patient.' });
    expect(sent.status).toBe(201);

    const list = await request(app).get(`/api/conversations/${conv.body.data.id}/messages`)
      .set('Cookie', authCookie(asha));
    expect(list.body.data.items).toHaveLength(1);
  });

  it('hides conversations from non-members', async () => {
    const conv = await request(app).post('/api/conversations').set('Cookie', authCookie(doctor))
      .send({ subject: 'Private', memberIds: [] });

    const res = await request(app).get(`/api/conversations/${conv.body.data.id}/messages`)
      .set('Cookie', authCookie(patientUser));
    expect(res.status).toBe(404);
  });

  it('notifies other members of a new message', async () => {
    const conv = await request(app).post('/api/conversations').set('Cookie', authCookie(doctor))
      .send({ memberIds: [asha.id] });
    await request(app).post(`/api/conversations/${conv.body.data.id}/messages`)
      .set('Cookie', authCookie(doctor)).send({ body: 'Hello' });

    const notif = getDb().prepare("SELECT * FROM notifications WHERE type='MESSAGE' AND user_id=?").get(asha.id);
    expect(notif).toBeTruthy();
  });
});
