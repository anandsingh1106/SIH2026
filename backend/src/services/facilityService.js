import crypto from 'crypto';
import { getDb, transaction } from '../db/connection.js';
import { recordAudit } from './auditService.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

const now = () => new Date().toISOString();

// Bed and staff counts are joined in per facility, so the registry shows
// capacity from the live bed and user tables instead of a typed-in figure.
const FACILITY_SELECT = `
  SELECT f.*,
    (SELECT COUNT(*) FROM beds b WHERE b.facility_id = f.id) AS beds_total,
    (SELECT COUNT(*) FROM beds b WHERE b.facility_id = f.id AND b.status = 'AVAILABLE') AS beds_available,
    (SELECT COUNT(*) FROM beds b WHERE b.facility_id = f.id AND b.type = 'ICU') AS icu_total,
    (SELECT COUNT(*) FROM beds b WHERE b.facility_id = f.id AND b.type = 'ICU' AND b.status = 'AVAILABLE') AS icu_available,
    (SELECT COUNT(*) FROM beds b WHERE b.facility_id = f.id AND b.type = 'VENTILATOR') AS ventilator_total,
    (SELECT COUNT(*) FROM users u WHERE u.facility_id = f.id AND u.status = 'ACTIVE'
       AND u.role IN ('DOCTOR','SPECIALIST')) AS doctors,
    (SELECT COUNT(*) FROM users u WHERE u.facility_id = f.id AND u.status = 'ACTIVE'
       AND u.role = 'ASHA') AS asha_workers
  FROM facilities f
`;

export function listFacilities({ search, district, type, includeInactive, page = 1, limit = 50 } = {}) {
  const db = getDb();
  const where = [];
  const params = [];

  if (!includeInactive) where.push('f.active = 1');
  if (search) {
    where.push('(f.name LIKE ? OR f.district LIKE ? OR f.taluka LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (district) { where.push('f.district = ?'); params.push(district); }
  if (type) { where.push('f.type = ?'); params.push(type); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM facilities f ${whereSql}`).get(...params).c;
  const items = db
    .prepare(`${FACILITY_SELECT} ${whereSql} ORDER BY f.active DESC, f.name ASC LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);

  return { items, total };
}

export function getFacility(id, db = getDb()) {
  const row = db.prepare(`${FACILITY_SELECT} WHERE f.id = ?`).get(id);
  if (!row) throw new NotFoundError('Facility');
  return row;
}

export function createFacility(user, input, requestMeta = {}) {
  return transaction((db) => {
    const duplicate = db
      .prepare('SELECT 1 FROM facilities WHERE lower(name) = lower(?) AND district = ?')
      .get(input.name, input.district);
    if (duplicate) {
      throw new ConflictError(`${input.name} is already registered in ${input.district}.`);
    }

    const id = crypto.randomUUID();
    const ts = now();
    db.prepare(`
      INSERT INTO facilities (id, name, type, address, district, taluka, village,
        latitude, longitude, phone, email, emergency_available, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id, input.name, input.type, input.address ?? null, input.district,
      input.taluka ?? null, input.village ?? null, input.latitude ?? null, input.longitude ?? null,
      input.phone ?? null, input.email ?? null, input.emergencyAvailable ? 1 : 0, ts, ts
    );

    recordAudit(
      { actorId: user.id, action: 'CREATE_FACILITY', entityType: 'facility', entityId: id,
        newValues: { name: input.name, type: input.type, district: input.district }, ...requestMeta },
      db
    );

    return getFacility(id, db);
  });
}

const UPDATABLE = {
  name: 'name',
  type: 'type',
  address: 'address',
  district: 'district',
  taluka: 'taluka',
  village: 'village',
  latitude: 'latitude',
  longitude: 'longitude',
  phone: 'phone',
  email: 'email',
  emergencyAvailable: 'emergency_available',
  active: 'active',
};

export function updateFacility(user, id, input, requestMeta = {}) {
  return transaction((db) => {
    const existing = db.prepare('SELECT * FROM facilities WHERE id = ?').get(id);
    if (!existing) throw new NotFoundError('Facility');

    const sets = [];
    const params = [];
    const oldValues = {};
    for (const [key, column] of Object.entries(UPDATABLE)) {
      if (input[key] === undefined) continue;
      const value = typeof input[key] === 'boolean' ? (input[key] ? 1 : 0) : input[key];
      sets.push(`${column} = ?`);
      params.push(value === '' ? null : value);
      oldValues[key] = existing[column];
    }

    if (sets.length) {
      sets.push('updated_at = ?');
      db.prepare(`UPDATE facilities SET ${sets.join(', ')} WHERE id = ?`).run(...params, now(), id);

      recordAudit(
        { actorId: user.id,
          action: input.active === false ? 'DEACTIVATE_FACILITY' : 'UPDATE_FACILITY',
          entityType: 'facility', entityId: id, oldValues, newValues: input, ...requestMeta },
        db
      );
    }

    return getFacility(id, db);
  });
}
