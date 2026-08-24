import 'dotenv/config';
import pg from 'pg';

/**
 * Verifies the deployed Supabase schema — that RLS is actually forced, the
 * concurrency constraints exist, and enums/FKs landed correctly.
 */

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

const q = async (sql, params = []) => (await client.query(sql, params)).rows;

await client.connect();

const tables = await q(`
  select c.relname,
         c.relrowsecurity  as rls_enabled,
         c.relforcerowsecurity as rls_forced,
         (select count(*) from pg_policies p where p.tablename = c.relname) as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname
`);

console.log(`TABLES: ${tables.length}\n`);

const noRls = tables.filter((t) => !t.rls_enabled);
const notForced = tables.filter((t) => t.rls_enabled && !t.rls_forced);
const noPolicy = tables.filter((t) => t.rls_enabled && Number(t.policies) === 0);

console.log(`RLS enabled on all tables : ${noRls.length === 0 ? 'PASS' : 'FAIL -> ' + noRls.map(t => t.relname).join(', ')}`);
console.log(`RLS forced on all tables  : ${notForced.length === 0 ? 'PASS' : 'FAIL -> ' + notForced.map(t => t.relname).join(', ')}`);
console.log(`Every table has a policy  : ${noPolicy.length === 0 ? 'PASS' : 'FAIL -> ' + noPolicy.map(t => t.relname).join(', ')}`);

const enums = await q(`select count(*)::int c from pg_type where typtype='e' and typnamespace='public'::regnamespace`);
const fks = await q(`select count(*)::int c from pg_constraint where contype='f' and connamespace='public'::regnamespace`);
const checks = await q(`select count(*)::int c from pg_constraint where contype='c' and connamespace='public'::regnamespace`);
const triggers = await q(`select count(*)::int c from pg_trigger where not tgisinternal`);

console.log(`\nenums: ${enums[0].c}   foreign keys: ${fks[0].c}   checks: ${checks[0].c}   triggers: ${triggers[0].c}`);

// The two partial unique indexes are the concurrency guarantees.
const critical = await q(`
  select indexname, indexdef from pg_indexes
  where schemaname='public' and indexname in ('idx_appt_slot_unique','idx_bed_alloc_active')
`);
console.log('\nConcurrency constraints:');
for (const name of ['idx_appt_slot_unique', 'idx_bed_alloc_active']) {
  const found = critical.find((i) => i.indexname === name);
  console.log(`  ${name}: ${found ? 'PRESENT' : 'MISSING'}`);
}

// Helper functions the policies depend on.
const fns = await q(`
  select proname from pg_proc
  where pronamespace='public'::regnamespace
    and proname in ('can_access_patient','current_app_user_id','current_app_role','is_admin','is_clinician','current_facility_id')
  order by proname
`);
console.log(`\nRLS helper functions: ${fns.map((f) => f.proname).join(', ')}`);

await client.end();
