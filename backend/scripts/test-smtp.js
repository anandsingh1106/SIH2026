import 'dotenv/config';

/**
 * Verifies that Supabase can actually send a confirmation email.
 *
 * Signs up a throwaway account, reports whether the email dispatched, then
 * deletes the account so it does not linger.
 *
 * Usage: node scripts/test-smtp.js your-real-email@gmail.com
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const target = process.argv[2];

if (!target) {
  console.error('Usage: node scripts/test-smtp.js your-real-email@gmail.com');
  process.exit(1);
}
if (!SUPABASE_URL || !ANON || !SERVICE) {
  console.error('Supabase env vars are missing from backend/.env.');
  process.exit(1);
}

// A +tag address routes to the same inbox but is a distinct account.
const [local, domain] = target.split('@');
const email = `${local}+smtptest${Date.now()}@${domain}`;

console.log(`Signing up ${email} ...`);

const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    password: `Test${Date.now()}!aA`,
    data: { name: 'SMTP Test', role: 'patient' },
  }),
});

const body = await res.json();

if (!res.ok) {
  console.log(`\nFAILED (HTTP ${res.status})`);
  console.log(`  ${body.msg || body.error_description || JSON.stringify(body)}`);
  if (String(body.msg || '').includes('rate limit')) {
    console.log('\n  Still using Supabase\'s built-in SMTP, or the interval is too high.');
    console.log('  Check: Project Settings -> Authentication -> SMTP Settings.');
  }
  process.exit(1);
}

console.log('\nSUCCESS — Supabase accepted the signup and dispatched the email.');
console.log(`  confirmation_sent_at: ${body.confirmation_sent_at || '(none — autoconfirm may be on)'}`);
console.log(`\n  Check the inbox for ${target}. It may take a minute; look in spam too.`);

// Remove the throwaway account.
const list = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=100`, {
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
}).then((r) => r.json());

const created = (list.users || []).find((u) => u.email === email);
if (created) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${created.id}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  console.log('  (test account deleted)');
}
