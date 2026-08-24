import crypto from 'crypto';
import { getDb } from '../db/connection.js';

export const patientRepository = {
  findById(id, db = getDb()) {
    return db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  },

  findByUserId(userId, db = getDb()) {
    return db.prepare('SELECT * FROM patients WHERE user_id = ?').get(userId);
  },

  /** Patient ids a PATIENT user owns — their own record plus linked family. */
  idsForPatientUser(userId, db = getDb()) {
    const self = this.findByUserId(userId, db);
    if (!self) return [];

    const family = db
      .prepare('SELECT related_patient_id FROM family_members WHERE patient_id = ? AND related_patient_id IS NOT NULL')
      .all(self.id)
      .map((r) => r.related_patient_id);

    return [self.id, ...family];
  },

  /** Patient ids assigned to an ASHA worker. */
  idsForAsha(ashaUserId, db = getDb()) {
    return db
      .prepare('SELECT id FROM patients WHERE assigned_asha_id = ?')
      .all(ashaUserId)
      .map((r) => r.id);
  },

  /** Filtered, paginated search. `patientIds` (when given) scopes by access. */
  list({ patientIds, search, district, taluka, village, ashaId, page = 1, limit = 20 }, db = getDb()) {
    const where = [];
    const params = [];

    if (patientIds) {
      if (patientIds.length === 0) return { items: [], total: 0 };
      where.push(`id IN (${patientIds.map(() => '?').join(',')})`);
      params.push(...patientIds);
    }
    if (search) {
      where.push('(name LIKE ? OR phone LIKE ? OR abha_id LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (district) { where.push('district = ?'); params.push(district); }
    if (taluka) { where.push('taluka = ?'); params.push(taluka); }
    if (village) { where.push('village = ?'); params.push(village); }
    if (ashaId) { where.push('assigned_asha_id = ?'); params.push(ashaId); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = db.prepare(`SELECT COUNT(*) AS c FROM patients ${whereSql}`).get(...params).c;
    const items = db
      .prepare(`SELECT * FROM patients ${whereSql} ORDER BY name ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);

    return { items, total };
  },

  update(id, fields, db = getDb()) {
    const columns = {
      name: 'name',
      dateOfBirth: 'date_of_birth',
      gender: 'gender',
      phone: 'phone',
      address: 'address',
      district: 'district',
      taluka: 'taluka',
      village: 'village',
      bloodGroup: 'blood_group',
      emergencyContact: 'emergency_contact',
      emergencyContactPhone: 'emergency_contact_phone',
      assignedAshaId: 'assigned_asha_id',
      abhaId: 'abha_id',
    };

    const sets = [];
    const params = [];
    for (const [key, column] of Object.entries(columns)) {
      if (fields[key] !== undefined) {
        sets.push(`${column} = ?`);
        params.push(fields[key]);
      }
    }
    if (sets.length === 0) return this.findById(id, db);

    sets.push('updated_at = ?');
    params.push(new Date().toISOString(), id);
    db.prepare(`UPDATE patients SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id, db);
  },

  listAllergies(patientId, db = getDb()) {
    return db.prepare('SELECT * FROM allergies WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
  },

  addAllergy(patientId, data, db = getDb()) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO allergies (id, patient_id, substance, reaction, severity, recorded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, patientId, data.substance, data.reaction ?? null,
           data.severity ?? null, data.recordedBy ?? null, new Date().toISOString());
    return db.prepare('SELECT * FROM allergies WHERE id = ?').get(id);
  },

  listChronicConditions(patientId, db = getDb()) {
    return db.prepare('SELECT * FROM chronic_conditions WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
  },

  addChronicCondition(patientId, data, db = getDb()) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO chronic_conditions (id, patient_id, condition, diagnosed_date, status, notes, recorded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, patientId, data.condition, data.diagnosedDate ?? null,
           data.status || 'ACTIVE', data.notes ?? null, data.recordedBy ?? null, new Date().toISOString());
    return db.prepare('SELECT * FROM chronic_conditions WHERE id = ?').get(id);
  },

  listFamilyMembers(patientId, db = getDb()) {
    return db
      .prepare(`
        SELECT fm.*, p.name AS related_name, p.date_of_birth AS related_dob, p.gender AS related_gender
        FROM family_members fm
        LEFT JOIN patients p ON p.id = fm.related_patient_id
        WHERE fm.patient_id = ?
      `)
      .all(patientId);
  },

  addFamilyMember(patientId, data, db = getDb()) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO family_members (id, patient_id, related_patient_id, name, relationship, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, patientId, data.relatedPatientId ?? null, data.name ?? null,
           data.relationship, new Date().toISOString());
    return db.prepare('SELECT * FROM family_members WHERE id = ?').get(id);
  },

  create(data, db = getDb()) {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO patients (id, user_id, abha_id, name, date_of_birth, gender, phone,
                            address, district, taluka, village, blood_group,
                            emergency_contact, emergency_contact_phone,
                            assigned_asha_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.userId ?? null,
      data.abhaId ?? null,
      data.name,
      data.dateOfBirth ?? null,
      data.gender ?? null,
      data.phone ?? null,
      data.address ?? null,
      data.district ?? null,
      data.taluka ?? null,
      data.village ?? null,
      data.bloodGroup ?? null,
      data.emergencyContact ?? null,
      data.emergencyContactPhone ?? null,
      data.assignedAshaId ?? null,
      now,
      now
    );

    return this.findById(id, db);
  },

  /**
   * Returns the patient record for a PATIENT user, creating a minimal one on
   * first use so their appointments have somewhere to attach.
   */
  ensureForUser(user, db = getDb()) {
    const existing = this.findByUserId(user.id, db);
    if (existing) return existing;

    return this.create(
      {
        userId: user.id,
        name: user.name,
        phone: user.phone,
        district: user.district,
        taluka: user.taluka,
        village: user.village,
        abhaId: user.abha_id,
      },
      db
    );
  },
};
