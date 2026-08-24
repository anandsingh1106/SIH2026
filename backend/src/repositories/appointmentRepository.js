import crypto from 'crypto';
import { getDb } from '../db/connection.js';

const SELECT_BASE = `
  SELECT a.*,
         d.name AS doctor_name,
         f.name AS facility_name,
         p.name AS patient_name
  FROM appointments a
  LEFT JOIN users d ON d.id = a.doctor_id
  LEFT JOIN facilities f ON f.id = a.facility_id
  LEFT JOIN patients p ON p.id = a.patient_id
`;

// Slots freed by these statuses may be rebooked.
const SLOT_FREEING_STATUSES = "('CANCELLED','NO_SHOW')";

export const appointmentRepository = {
  findById(id, db = getDb()) {
    return db.prepare(`${SELECT_BASE} WHERE a.id = ?`).get(id);
  },

  /** Filtered, paginated list. `filters.patientIds` scopes access by role. */
  list({ patientIds, doctorId, facilityId, status, from, to, page = 1, limit = 20 }, db = getDb()) {
    const where = [];
    const params = [];

    if (patientIds) {
      if (patientIds.length === 0) return { items: [], total: 0 };
      where.push(`a.patient_id IN (${patientIds.map(() => '?').join(',')})`);
      params.push(...patientIds);
    }
    if (doctorId) { where.push('a.doctor_id = ?'); params.push(doctorId); }
    if (facilityId) { where.push('a.facility_id = ?'); params.push(facilityId); }
    if (status) { where.push('a.status = ?'); params.push(status); }
    if (from) { where.push('a.appointment_date >= ?'); params.push(from); }
    if (to) { where.push('a.appointment_date <= ?'); params.push(to); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = db
      .prepare(`SELECT COUNT(*) AS c FROM appointments a ${whereSql}`)
      .get(...params).c;

    const items = db
      .prepare(`${SELECT_BASE} ${whereSql} ORDER BY a.appointment_date ASC, a.appointment_time ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);

    return { items, total };
  },

  /** True when the doctor already has an active appointment in that slot. */
  isSlotTaken({ doctorId, date, time, excludeId }, db = getDb()) {
    if (!doctorId) return false;
    const params = [doctorId, date, time];
    let sql = `
      SELECT 1 FROM appointments
      WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?
        AND status NOT IN ${SLOT_FREEING_STATUSES}
    `;
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    return Boolean(db.prepare(sql).get(...params));
  },

  /** Next token number for a facility on a given date, starting at 1. */
  nextTokenNumber({ facilityId, date }, db = getDb()) {
    const row = db
      .prepare(`
        SELECT COALESCE(MAX(token_number), 0) AS max_token
        FROM appointments
        WHERE appointment_date = ? AND (facility_id IS ? OR facility_id = ?)
      `)
      .get(date, facilityId ?? null, facilityId ?? null);
    return (row?.max_token ?? 0) + 1;
  },

  create(data, db = getDb()) {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO appointments (id, patient_id, doctor_id, facility_id, specialty,
                                appointment_date, appointment_time, type, status,
                                reason, token_number, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.patientId,
      data.doctorId ?? null,
      data.facilityId ?? null,
      data.specialty ?? null,
      data.date,
      data.time,
      data.type,
      data.status || 'BOOKED',
      data.reason ?? null,
      data.tokenNumber ?? null,
      data.notes ?? null,
      now,
      now
    );

    return this.findById(id, db);
  },

  update(id, fields, db = getDb()) {
    const columns = {
      doctorId: 'doctor_id',
      facilityId: 'facility_id',
      specialty: 'specialty',
      date: 'appointment_date',
      time: 'appointment_time',
      type: 'type',
      status: 'status',
      reason: 'reason',
      notes: 'notes',
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

    db.prepare(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id, db);
  },
};
