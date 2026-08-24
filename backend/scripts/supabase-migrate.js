import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

/**
 * Applies supabase/migrations/*.sql to the Supabase Postgres database.
 *
 * Requires SUPABASE_DB_URL — the direct connection string from
 * Supabase dashboard -> Settings -> Database -> Connection string -> URI.
 * The REST API cannot execute DDL, so a real Postgres connection is needed.
 *
 * Usage:
 *   node scripts/supabase-migrate.js          apply all migrations
 *   node scripts/supabase-migrate.js --check  report current schema only
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error(`
SUPABASE_DB_URL is not set.

Get it from your Supabase dashboard:
  Settings -> Database -> Connection string -> URI

It looks like:
  postgresql://postgres.PROJECT_REF:YOUR_DB_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres

Add it to backend/.env as SUPABASE_DB_URL=...
`);
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function currentSchema() {
  const tables = await client.query(`
    select table_name from information_schema.tables
    where table_schema = 'public' order by table_name
  `);
  const policies = await client.query(`select count(*)::int as c from pg_policies where schemaname = 'public'`);
  const indexes = await client.query(`select count(*)::int as c from pg_indexes where schemaname = 'public'`);
  return {
    tables: tables.rows.map((r) => r.table_name),
    policies: policies.rows[0].c,
    indexes: indexes.rows[0].c,
  };
}

async function main() {
  await client.connect();
  console.log('Connected to Supabase Postgres.\n');

  if (process.argv.includes('--check')) {
    const s = await currentSchema();
    console.log(`tables:   ${s.tables.length}`);
    console.log(`policies: ${s.policies}`);
    console.log(`indexes:  ${s.indexes}`);
    if (s.tables.length) console.log(`\n${s.tables.join(', ')}`);
    await client.end();
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    process.stdout.write(`applying ${file} ... `);
    try {
      // Each file runs in its own transaction so a failure leaves no partial state.
      await client.query('begin');
      await client.query(sql);
      await client.query('commit');
      console.log('ok');
    } catch (err) {
      await client.query('rollback').catch(() => {});
      console.log('FAILED');
      console.error(`\n  ${err.message}`);
      if (err.position) {
        const upto = sql.slice(0, Number(err.position));
        console.error(`  at line ${upto.split('\n').length}`);
        console.error(`  near: ${sql.slice(Math.max(0, err.position - 90), Number(err.position) + 90).replace(/\s+/g, ' ')}`);
      }
      await client.end();
      process.exit(1);
    }
  }

  const s = await currentSchema();
  console.log(`\nSchema now: ${s.tables.length} tables, ${s.policies} policies, ${s.indexes} indexes.`);
  await client.end();
}

main().catch(async (err) => {
  console.error('\nMigration run failed:', err.message);
  await client.end().catch(() => {});
  process.exit(1);
});
