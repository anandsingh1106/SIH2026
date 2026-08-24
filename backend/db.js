import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEED_PATIENTS, SEED_PRESCRIPTIONS } from './seedData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, 'arogyasetu.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS prescriptions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    role TEXT NOT NULL,
    district TEXT,
    taluka TEXT,
    village TEXT,
    abha_id TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    facility TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    reason TEXT,
    token_number INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

function migrateLegacyUsersTable() {
  const columns = db.prepare('PRAGMA table_info(users)').all();
  const isLegacySchema = columns.some((c) => c.name === 'password_hash');
  if (!isLegacySchema) return;

  db.exec('DROP TABLE IF EXISTS users;');
  db.exec('DROP TABLE IF EXISTS otp_codes;');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT,
      role TEXT NOT NULL,
      district TEXT,
      taluka TEXT,
      village TEXT,
      abha_id TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

migrateLegacyUsersTable();

function seedIfEmpty() {
  const patientCount = db.prepare('SELECT COUNT(*) AS c FROM patients').get().c;
  if (patientCount === 0) {
    const insert = db.prepare('INSERT INTO patients (id, data) VALUES (?, ?)');
    for (const p of SEED_PATIENTS) insert.run(p.id, JSON.stringify(p));
  }

  const prescriptionCount = db.prepare('SELECT COUNT(*) AS c FROM prescriptions').get().c;
  if (prescriptionCount === 0) {
    const insert = db.prepare('INSERT INTO prescriptions (id, patient_id, data) VALUES (?, ?, ?)');
    for (const p of SEED_PRESCRIPTIONS) insert.run(p.id, p.patientId, JSON.stringify(p));
  }
}

seedIfEmpty();

export default db;
