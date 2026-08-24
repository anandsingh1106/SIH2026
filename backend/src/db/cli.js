import fs from 'fs';
import { env } from '../config/env.js';
import { getDb, closeDb } from './connection.js';
import { runMigrations } from './migrator.js';
import { runSeed } from './seeds/index.js';

const command = process.argv[2];

async function migrate() {
  await runMigrations();
}

async function seed() {
  await runMigrations({ silent: true });
  await runSeed();
}

async function reset() {
  closeDb();
  // Remove the database and its WAL sidecar files for a clean rebuild.
  for (const suffix of ['', '-wal', '-shm']) {
    const file = env.DATABASE_PATH + suffix;
    if (!fs.existsSync(file)) continue;
    try {
      fs.unlinkSync(file);
    } catch (err) {
      // Windows keeps the file locked while another process has it open.
      if (err.code === 'EBUSY' || err.code === 'EPERM') {
        throw new Error(
          `Cannot delete ${file} because another process is using it.\n` +
          `Stop the running API server (npm run dev / npm start) and try again.`
        );
      }
      throw err;
    }
  }
  console.log('Database removed.');
  getDb();
  await runMigrations();
  await runSeed();
}

const commands = { migrate, seed, reset };

if (!commands[command]) {
  console.error(`Usage: node src/db/cli.js <migrate|seed|reset>`);
  process.exit(1);
}

try {
  await commands[command]();
  closeDb();
} catch (err) {
  console.error(`\n${command} failed:`, err.message);
  console.error(err.stack);
  process.exit(1);
}
