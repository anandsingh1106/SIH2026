import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, transaction } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

function appliedMigrations(db) {
  return new Set(db.prepare('SELECT name FROM _migrations').all().map((r) => r.name));
}

/**
 * Applies every migration file that has not run yet, in filename order.
 * Safe to run repeatedly — already-applied migrations are skipped.
 */
export async function runMigrations({ silent = false } = {}) {
  const db = getDb();
  ensureMigrationsTable(db);
  const applied = appliedMigrations(db);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort();

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    if (!silent) console.log('Migrations: already up to date.');
    return { applied: [] };
  }

  const appliedNow = [];
  for (const file of pending) {
    const module = await import(new URL(`./migrations/${file}`, import.meta.url).href);
    if (typeof module.up !== 'function') {
      throw new Error(`Migration ${file} does not export an "up" function.`);
    }

    transaction((tx) => {
      module.up(tx);
      tx.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(
        file,
        new Date().toISOString()
      );
    });

    appliedNow.push(file);
    if (!silent) console.log(`  applied ${file}`);
  }

  if (!silent) console.log(`Migrations: applied ${appliedNow.length}.`);
  return { applied: appliedNow };
}
