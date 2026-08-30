import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTotp } from '../src/utils/totp.js';

/**
 * Prints the current 6-digit code for a demo staff account.
 *
 * Two-factor stays enforced during a demo, so this is how you sign in without
 * adding every account to a phone. Secrets come from DEMO_ACCOUNTS.md, written
 * by create-demo-accounts.js.
 *
 * Usage:
 *   npm run demo:code -- demo.doctor@arogyasetu.test
 *   npm run demo:code -- doctor          # a distinctive fragment is enough
 *   npm run demo:code                    # lists the accounts
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOC = path.resolve(__dirname, '../../DEMO_ACCOUNTS.md');

if (!fs.existsSync(DOC)) {
  console.error('DEMO_ACCOUNTS.md not found. Run: npm run demo:accounts');
  process.exit(1);
}

const doc = fs.readFileSync(DOC, 'utf8');

// Parse the secrets table: | ROLE | `email` | `SECRET` |
const accounts = [...doc.matchAll(/^\|\s*(\w+)\s*\|\s*`([^`]+)`\s*\|\s*`([A-Z2-7]{16,})`\s*\|/gm)]
  .map((m) => ({ role: m[1], email: m[2], secret: m[3] }));

const password = doc.match(/\*\*Shared password for every account:\*\*\s*`([^`]+)`/)?.[1];

if (!accounts.length) {
  console.error('No TOTP secrets found in DEMO_ACCOUNTS.md.');
  console.error('Re-run `npm run demo:accounts` with SUPABASE_ANON_KEY set.');
  process.exit(1);
}

const query = process.argv[2];

if (!query) {
  console.log(`\nDemo password: ${password ?? '(see DEMO_ACCOUNTS.md)'}\n`);
  console.log('Staff accounts with a second factor:\n');
  for (const a of accounts) console.log(`  ${a.email.padEnd(38)} ${a.role}`);
  console.log('\nGet a code:  npm run demo:code -- demo.doctor@arogyasetu.test');
  process.exit(0);
}

const matches = accounts.filter((a) => a.email.includes(query));

if (!matches.length) {
  console.error(`No staff account matching "${query}".`);
  console.error('Run `npm run demo:code` on its own to list them.');
  process.exit(1);
}
if (matches.length > 1) {
  console.error(`"${query}" matches ${matches.length} accounts — be more specific:`);
  for (const a of matches) console.error(`  ${a.email}`);
  process.exit(1);
}

const account = matches[0];
const code = generateTotp(account.secret);
// Say how long it lasts, so nobody types a code that is about to roll over.
const secondsLeft = 30 - Math.floor((Date.now() / 1000) % 30);

console.log(`
  ${account.role}  ${account.email}
  Password:  ${password ?? '(see DEMO_ACCOUNTS.md)'}

  Code:      ${code}
  Valid for: ${secondsLeft}s
`);

if (secondsLeft <= 5) console.log('  (rolling over — re-run for a fresh one)\n');
