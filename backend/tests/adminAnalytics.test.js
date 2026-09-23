import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { resetTestDb, createUser, createPatient, createFacility, authCookie, request } from './helpers.js';
import { getDb } from '../src/db/connection.js';

const app = createApp();
const ts = () => new Date().toISOString();

let facility, admin, doctor, patient;

function insert(table, row) {
  const cols = Object.keys(row);
  getDb().prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
    .run(...Object.values(row));
}

beforeEach(async () => {
  await resetTestDb();
  facility = createFacility({ name: 'PHC Paud', district: 'Pune' });
  admin = createUser({ role: 'ADMIN', name: 'Admin' });
  doctor = createUser({ role: 'DOCTOR', name: 'Dr Test', facilityId: facility.id });
  patient = createPatient({ name: 'Sita', district: 'Pune' });
  getDb().prepare("UPDATE patients SET taluka = 'Mulshi', village = 'Kolvan' WHERE id = ?").run(patient.id);
});

describe('admin analytics endpoints', () => {
  it('are admin only', async () => {
    for (const path of ['districts', 'insights', 'reports', 'reports/referrals']) {
      const res = await request(app).get(`/api/analytics/${path}`).set('Cookie', authCookie(doctor));
      expect(res.status).toBe(403);
    }
  });

  it('counts each district from platform records', async () => {
    for (let i = 0; i < 4; i++) {
      insert('beds', { id: crypto.randomUUID(), facility_id: facility.id, bed_number: `B${i}`, type: 'GENERAL',
        status: i < 3 ? 'OCCUPIED' : 'AVAILABLE', created_at: ts(), updated_at: ts() });
    }

    const res = await request(app).get('/api/analytics/districts').set('Cookie', authCookie(admin));
    expect(res.status).toBe(200);
    const pune = res.body.data.find((d) => d.district === 'Pune');
    expect(pune).toMatchObject({ patients: 1, doctors: 1 });
    expect(pune.facilities).toMatchObject({ total: 1, phcs: 1 });
    expect(pune.beds).toMatchObject({ total: 4, occupied: 3, occupancyRate: 75 });
    // Nothing is stocked, so availability is unknown rather than 0%.
    expect(pune.stock.availabilityRate).toBeNull();
  });

  it('raises signals from real records and shows the evidence', async () => {
    insert('referrals', { id: crypto.randomUUID(), referral_code: 'REF-1', patient_id: patient.id,
      destination_facility_id: facility.id, urgency: 'EMERGENCY', status: 'SENT', created_at: ts(), updated_at: ts() });
    const medicineId = crypto.randomUUID();
    insert('medicines', { id: medicineId, name: 'Metformin', active: 1, is_essential: 1, created_at: ts(), updated_at: ts() });
    insert('inventory', { id: crypto.randomUUID(), medicine_id: medicineId, facility_id: facility.id,
      quantity: 0, reorder_level: 20, created_at: ts(), updated_at: ts() });

    const res = await request(app).get('/api/analytics/insights').set('Cookie', authCookie(admin));
    expect(res.status).toBe(200);
    const ids = res.body.data.signals.map((s) => s.id);
    expect(ids).toContain('referrals:emergency-waiting');
    expect(ids).toContain('stock:PHC Paud');

    const stock = res.body.data.signals.find((s) => s.id === 'stock:PHC Paud');
    expect(stock.severity).toBe('critical');
    expect(stock.evidence).toContain('Metformin (0)');
    expect(res.body.data.signals[0].severity).toBe('critical');
  });

  it('returns no signals when nothing needs attention', async () => {
    const res = await request(app).get('/api/analytics/insights').set('Cookie', authCookie(admin));
    expect(res.body.data.signals).toEqual([]);
  });

  it('exports a report table and audits the export', async () => {
    insert('referrals', { id: crypto.randomUUID(), referral_code: 'REF-9', patient_id: patient.id,
      urgency: 'URGENT', status: 'SENT', specialty: 'Cardiology', created_at: ts(), updated_at: ts() });

    const res = await request(app).get('/api/analytics/reports/referrals').set('Cookie', authCookie(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.columns[0]).toBe('Referral code');
    expect(res.body.data.rows).toHaveLength(1);
    expect(res.body.data.rows[0]).toHaveLength(res.body.data.columns.length);
    // The register carries no patient name.
    expect(JSON.stringify(res.body.data.rows)).not.toContain('Sita');

    const audit = getDb().prepare("SELECT * FROM audit_logs WHERE action = 'EXPORT_REPORT'").get();
    expect(audit.entity_id).toBe('referrals');
  });

  it('keeps every report row as wide as its header', async () => {
    const catalogue = await request(app).get('/api/analytics/reports').set('Cookie', authCookie(admin));
    expect(catalogue.body.data.length).toBeGreaterThan(0);
    for (const { type } of catalogue.body.data) {
      const res = await request(app).get(`/api/analytics/reports/${type}`).set('Cookie', authCookie(admin));
      expect(res.status).toBe(200);
      for (const row of res.body.data.rows) expect(row).toHaveLength(res.body.data.columns.length);
    }
  });

  it('rejects an unknown report type', async () => {
    const res = await request(app).get('/api/analytics/reports/salaries').set('Cookie', authCookie(admin));
    expect(res.status).toBe(400);
  });

  it('adds monthly trends and village hotspots to the admin summary', async () => {
    insert('ncd_screenings', { id: crypto.randomUUID(), patient_id: patient.id, screening_date: ts().slice(0, 10),
      risk_category: 'HIGH', created_at: ts() });

    const res = await request(app).get('/api/analytics/admin').set('Cookie', authCookie(admin));
    expect(res.body.data.trends).toHaveLength(6);
    expect(res.body.data.trends.at(-1).screenings).toBe(1);
    expect(res.body.data.hotspots[0]).toMatchObject({ village: 'Kolvan', ncdHighRisk: 1 });
  });
});

describe('doctor practice analytics', () => {
  it('reports weekly volume, diagnoses and the antibiotic share', async () => {
    const consult = (diagnosis, tele = 0) => insert('consultations', {
      id: crypto.randomUUID(), patient_id: patient.id, doctor_id: doctor.id, diagnosis,
      is_telemedicine: tele, status: 'COMPLETED', created_at: ts(), updated_at: ts(),
    });
    consult('Essential hypertension');
    consult('Essential hypertension', 1);
    consult('Acute viral fever');

    const prescribe = (medicine) => {
      const id = crypto.randomUUID();
      insert('prescriptions', { id, patient_id: patient.id, doctor_id: doctor.id, status: 'ACTIVE',
        issued_at: ts(), created_at: ts(), updated_at: ts() });
      insert('prescription_items', { id: crypto.randomUUID(), prescription_id: id, medicine_name: medicine,
        created_at: ts() });
    };
    prescribe('Tab Amoxicillin 500mg');
    prescribe('Tab Paracetamol 500mg');

    const res = await request(app).get('/api/analytics/doctor').set('Cookie', authCookie(doctor));
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.weekly).toHaveLength(8);
    expect(data.weekly.at(-1)).toMatchObject({ opd: 2, tele: 1 });
    expect(data.topDiagnoses[0]).toMatchObject({ diagnosis: 'Essential hypertension', count: 2 });
    expect(data.antibiotic).toMatchObject({ prescriptions: 2, withAntibiotic: 1, rate: 50 });
    expect(data.teleconsultations).toBe(1);
  });
});
