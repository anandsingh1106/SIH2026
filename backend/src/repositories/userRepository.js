import crypto from 'crypto';
import { getDb } from '../db/connection.js';

const SELECT_WITH_FACILITY = `
  SELECT u.*, f.name AS facility_name
  FROM users u
  LEFT JOIN facilities f ON f.id = u.facility_id
`;

export const userRepository = {
  findById(id, db = getDb()) {
    return db.prepare(`${SELECT_WITH_FACILITY} WHERE u.id = ?`).get(id);
  },

  findByPhone(phone, db = getDb()) {
    return db.prepare(`${SELECT_WITH_FACILITY} WHERE u.phone = ?`).get(phone);
  },

  findByAuthUserId(authUserId, db = getDb()) {
    return db.prepare(`${SELECT_WITH_FACILITY} WHERE u.auth_user_id = ?`).get(authUserId);
  },

  findByEmail(email, db = getDb()) {
    return db.prepare(`${SELECT_WITH_FACILITY} WHERE u.email = ?`).get(email);
  },

  create(data, db = getDb()) {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, auth_user_id, name, phone, email, role, status,
                         district, taluka, village, abha_id, facility_id,
                         created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.authUserId ?? null,
      data.name,
      data.phone,
      data.email ?? null,
      data.role,
      data.district ?? null,
      data.taluka ?? null,
      data.village ?? null,
      data.abhaId ?? null,
      data.facilityId ?? null,
      now,
      now
    );

    return this.findById(id, db);
  },

  /**
   * Staff directory for administrators.
   *
   * PATIENT is never listed: this is a workforce roster, and patients reach the
   * admin screens only as counts in analytics.
   */
  listStaff({ role, district, search, page = 1, limit = 20 } = {}, db = getDb()) {
    const where = ["u.role != 'PATIENT'"];
    const params = [];

    if (role) { where.push('u.role = ?'); params.push(role); }
    if (district) { where.push('u.district = ?'); params.push(district); }
    if (search) {
      where.push('(u.name LIKE ? OR f.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const total = db
      .prepare(`SELECT COUNT(*) AS c FROM users u LEFT JOIN facilities f ON f.id = u.facility_id ${whereSql}`)
      .get(...params).c;

    const items = db
      .prepare(`
        ${SELECT_WITH_FACILITY}
        ${whereSql}
        ORDER BY CASE u.role
                   WHEN 'ADMIN' THEN 0 WHEN 'SPECIALIST' THEN 1
                   WHEN 'DOCTOR' THEN 2 ELSE 3 END,
                 u.name
        LIMIT ? OFFSET ?
      `)
      .all(...params, limit, (page - 1) * limit);

    return { items, total };
  },

  linkAuthUserId(id, authUserId, db = getDb()) {
    db.prepare('UPDATE users SET auth_user_id = ?, updated_at = ? WHERE id = ?')
      .run(authUserId, new Date().toISOString(), id);
  },

  touchLastLogin(id, db = getDb()) {
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
      .run(new Date().toISOString(), id);
  },
};
