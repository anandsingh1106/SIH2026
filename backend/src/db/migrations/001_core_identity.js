/**
 * Phase 1 — core identity: facilities, users, audit logs.
 *
 * The pre-migration schema had a flat `users` table (id, name, phone, email,
 * role, district, taluka, village, abha_id, created_at) created directly by the
 * old db.js. This migration rebuilds it with facility_id, firebase_uid, status
 * and updated_at, carrying any existing rows across.
 */
export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN (
        'SUB_CENTER','PHC','CHC','DISTRICT_HOSPITAL','SPECIALIST_HOSPITAL','MEDICAL_COLLEGE'
      )),
      address TEXT,
      district TEXT NOT NULL,
      taluka TEXT,
      village TEXT,
      latitude REAL,
      longitude REAL,
      phone TEXT,
      email TEXT,
      emergency_available INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_facilities_district ON facilities(district);
    CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities(type);
    CREATE INDEX IF NOT EXISTS idx_facilities_active ON facilities(active);
  `);

  const hasUsers = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    .get();

  const legacyUsers = hasUsers
    ? db.prepare('SELECT * FROM users').all()
    : [];

  if (hasUsers) {
    db.exec('ALTER TABLE users RENAME TO _users_old;');
  }

  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      firebase_uid TEXT UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT,
      role TEXT NOT NULL CHECK (role IN ('PATIENT','ASHA','DOCTOR','SPECIALIST','ADMIN')),
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
      district TEXT,
      taluka TEXT,
      village TEXT,
      abha_id TEXT,
      facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_facility ON users(facility_id);
    CREATE INDEX IF NOT EXISTS idx_users_district ON users(district);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
  `);

  // Roles were previously stored lowercase ('patient'); they are now uppercase.
  if (legacyUsers.length > 0) {
    const insert = db.prepare(`
      INSERT INTO users (id, name, phone, email, role, district, taluka, village, abha_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of legacyUsers) {
      const now = u.created_at || new Date().toISOString();
      insert.run(
        u.id,
        u.name,
        u.phone,
        u.email ?? null,
        String(u.role || 'patient').toUpperCase(),
        u.district ?? null,
        u.taluka ?? null,
        u.village ?? null,
        u.abha_id ?? null,
        now,
        now
      );
    }
  }

  if (hasUsers) {
    db.exec('DROP TABLE _users_old;');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);
}
