import crypto from 'crypto';
import { getDb } from '../db/connection.js';

const now = () => new Date().toISOString();

const CONSULT_SELECT = `
  SELECT c.*, d.name AS doctor_name, p.name AS patient_name, f.name AS facility_name
  FROM consultations c
  LEFT JOIN users d ON d.id = c.doctor_id
  LEFT JOIN patients p ON p.id = c.patient_id
  LEFT JOIN facilities f ON f.id = c.facility_id
`;

export const consultationRepository = {
  findById(id, db = getDb()) {
    return db.prepare(`${CONSULT_SELECT} WHERE c.id = ?`).get(id);
  },

  list({ patientIds, patientId, doctorId, facilityId, status, page = 1, limit = 20 }, db = getDb()) {
    const where = [];
    const params = [];

    if (patientIds) {
      if (patientIds.length === 0) return { items: [], total: 0 };
      where.push(`c.patient_id IN (${patientIds.map(() => '?').join(',')})`);
      params.push(...patientIds);
    }
    if (patientId) { where.push('c.patient_id = ?'); params.push(patientId); }
    if (doctorId) { where.push('c.doctor_id = ?'); params.push(doctorId); }
    if (facilityId) { where.push('c.facility_id = ?'); params.push(facilityId); }
    if (status) { where.push('c.status = ?'); params.push(status); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS c FROM consultations c ${whereSql}`).get(...params).c;
    const items = db
      .prepare(`${CONSULT_SELECT} ${whereSql} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);

    return { items, total };
  },

  create(data, db = getDb()) {
    const id = data.id || crypto.randomUUID();
    const ts = now();
    db.prepare(`
      INSERT INTO consultations (id, patient_id, doctor_id, appointment_id, facility_id,
        chief_complaint, symptoms, examination, diagnosis, icd_code, clinical_notes,
        treatment_plan, follow_up_date, is_telemedicine, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.patientId, data.doctorId ?? null, data.appointmentId ?? null, data.facilityId ?? null,
      data.chiefComplaint ?? null,
      data.symptoms ? JSON.stringify(data.symptoms) : null,
      data.examination ?? null, data.diagnosis ?? null, data.icdCode ?? null,
      data.clinicalNotes ?? null, data.treatmentPlan ?? null, data.followUpDate ?? null,
      data.isTelemedicine ? 1 : 0, data.status || 'IN_PROGRESS', ts, ts
    );
    return this.findById(id, db);
  },

  update(id, fields, db = getDb()) {
    const columns = {
      chiefComplaint: 'chief_complaint', examination: 'examination', diagnosis: 'diagnosis',
      icdCode: 'icd_code', clinicalNotes: 'clinical_notes', treatmentPlan: 'treatment_plan',
      followUpDate: 'follow_up_date', status: 'status',
    };
    const sets = [];
    const params = [];
    for (const [key, column] of Object.entries(columns)) {
      if (fields[key] !== undefined) { sets.push(`${column} = ?`); params.push(fields[key]); }
    }
    if (fields.symptoms !== undefined) {
      sets.push('symptoms = ?');
      params.push(JSON.stringify(fields.symptoms));
    }
    if (sets.length === 0) return this.findById(id, db);

    sets.push('updated_at = ?');
    params.push(now(), id);
    db.prepare(`UPDATE consultations SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id, db);
  },
};

export const vitalsRepository = {
  listForPatient(patientId, { limit = 50 } = {}, db = getDb()) {
    return db
      .prepare('SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT ?')
      .all(patientId, limit);
  },

  create(data, db = getDb()) {
    const id = crypto.randomUUID();
    const ts = now();

    // BMI is derived rather than trusted from the client when both inputs exist.
    let bmi = data.bmi ?? null;
    if (bmi == null && data.weight && data.height) {
      const metres = data.height / 100;
      bmi = Number((data.weight / (metres * metres)).toFixed(1));
    }

    db.prepare(`
      INSERT INTO vitals (id, patient_id, consultation_id, recorded_by, facility_id,
        temperature, blood_pressure_systolic, blood_pressure_diastolic, heart_rate,
        respiratory_rate, oxygen_saturation, weight, height, bmi, blood_glucose,
        hemoglobin, notes, recorded_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.patientId, data.consultationId ?? null, data.recordedBy ?? null, data.facilityId ?? null,
      data.temperature ?? null, data.bloodPressureSystolic ?? null, data.bloodPressureDiastolic ?? null,
      data.heartRate ?? null, data.respiratoryRate ?? null, data.oxygenSaturation ?? null,
      data.weight ?? null, data.height ?? null, bmi, data.bloodGlucose ?? null,
      data.hemoglobin ?? null, data.notes ?? null, data.recordedAt || ts, ts
    );
    return db.prepare('SELECT * FROM vitals WHERE id = ?').get(id);
  },
};

const RX_SELECT = `
  SELECT r.*, d.name AS doctor_name, p.name AS patient_name, f.name AS facility_name
  FROM prescriptions r
  LEFT JOIN users d ON d.id = r.doctor_id
  LEFT JOIN patients p ON p.id = r.patient_id
  LEFT JOIN facilities f ON f.id = r.facility_id
`;

export const prescriptionRepository = {
  findById(id, db = getDb()) {
    return db.prepare(`${RX_SELECT} WHERE r.id = ?`).get(id);
  },

  listItems(prescriptionId, db = getDb()) {
    return db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?').all(prescriptionId);
  },

  list({ patientIds, patientId, doctorId, status, page = 1, limit = 20 }, db = getDb()) {
    const where = [];
    const params = [];

    if (patientIds) {
      if (patientIds.length === 0) return { items: [], total: 0 };
      where.push(`r.patient_id IN (${patientIds.map(() => '?').join(',')})`);
      params.push(...patientIds);
    }
    if (patientId) { where.push('r.patient_id = ?'); params.push(patientId); }
    if (doctorId) { where.push('r.doctor_id = ?'); params.push(doctorId); }
    if (status) { where.push('r.status = ?'); params.push(status); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS c FROM prescriptions r ${whereSql}`).get(...params).c;
    const items = db
      .prepare(`${RX_SELECT} ${whereSql} ORDER BY r.issued_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);

    return { items, total };
  },

  create(data, items, db = getDb()) {
    const id = data.id || crypto.randomUUID();
    const ts = now();

    db.prepare(`
      INSERT INTO prescriptions (id, patient_id, doctor_id, consultation_id, facility_id,
        diagnosis, instructions, dietary_instructions, follow_up_date, status, issued_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.patientId, data.doctorId ?? null, data.consultationId ?? null, data.facilityId ?? null,
      data.diagnosis ?? null, data.instructions ?? null, data.dietaryInstructions ?? null,
      data.followUpDate ?? null, data.status || 'ACTIVE', data.issuedAt || ts, ts, ts
    );

    const insertItem = db.prepare(`
      INSERT INTO prescription_items (id, prescription_id, medicine_id, medicine_name,
        dosage, frequency, duration, route, timing, quantity, instructions,
        instructions_mr, instructions_hi, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      insertItem.run(
        crypto.randomUUID(), id, item.medicineId ?? null, item.medicineName,
        item.dosage ?? null, item.frequency ?? null, item.duration ?? null,
        item.route ?? null, item.timing ? JSON.stringify(item.timing) : null,
        item.quantity ?? null, item.instructions ?? null,
        item.instructionsMr ?? null, item.instructionsHi ?? null, ts
      );
    }

    return this.findById(id, db);
  },

  updateStatus(id, status, db = getDb()) {
    db.prepare('UPDATE prescriptions SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id);
    return this.findById(id, db);
  },
};

export const medicineRepository = {
  findById(id, db = getDb()) {
    return db.prepare('SELECT * FROM medicines WHERE id = ?').get(id);
  },

  list({ search, category, page = 1, limit = 20 }, db = getDb()) {
    const where = ['active = 1'];
    const params = [];
    if (search) {
      where.push('(name LIKE ? OR generic_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) { where.push('category = ?'); params.push(category); }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const total = db.prepare(`SELECT COUNT(*) AS c FROM medicines ${whereSql}`).get(...params).c;
    const items = db
      .prepare(`SELECT * FROM medicines ${whereSql} ORDER BY name ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);

    return { items, total };
  },

  create(data, db = getDb()) {
    const id = data.id || crypto.randomUUID();
    const ts = now();
    db.prepare(`
      INSERT INTO medicines (id, name, generic_name, strength, dosage_form, manufacturer,
        category, is_essential, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, data.name, data.genericName ?? null, data.strength ?? null,
           data.dosageForm ?? null, data.manufacturer ?? null, data.category ?? null,
           data.isEssential ? 1 : 0, ts, ts);
    return this.findById(id, db);
  },
};
