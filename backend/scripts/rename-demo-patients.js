import 'dotenv/config';
import { getDb, transaction } from '../src/db/connection.js';

/**
 * Gives every generated demo patient a distinct name.
 *
 * seed-scale.js used to step the surname once every three records while the
 * first names cycled every sixteen, so a 120-row registry held only 48 distinct
 * names — most repeated three times. Two "Amol Bhosale" rows side by side make
 * the registry unreadable and invite opening the wrong record.
 *
 * seed-scale.js is idempotent, so it will not revisit rows that already exist.
 * This renames them in place using the corrected scheme.
 *
 * Patients linked to a demo login account keep their names, since those are
 * referenced in DEMO_ACCOUNTS.md and used to sign in.
 *
 * Usage: node scripts/rename-demo-patients.js [--dry-run]
 */

const FIRST_M = ['Ramesh', 'Suresh', 'Ganesh', 'Mahesh', 'Vijay', 'Sanjay', 'Anil', 'Sunil',
  'Prakash', 'Dinesh', 'Nitin', 'Sachin', 'Amol', 'Rahul', 'Prasad', 'Nilesh',
  'Bhaskar', 'Dattatray', 'Kishor', 'Madhav', 'Narayan', 'Pandurang', 'Shrikant', 'Tukaram',
  'Vishal', 'Yogesh', 'Ashok', 'Bharat', 'Chandrakant', 'Deepak', 'Eknath', 'Gopal'];
const FIRST_F = ['Sunita', 'Kavita', 'Anita', 'Lata', 'Mangala', 'Shobha', 'Vaishali', 'Rekha',
  'Sujata', 'Manisha', 'Archana', 'Pooja', 'Snehal', 'Nanda', 'Ujwala', 'Vandana',
  'Asha', 'Bharati', 'Chhaya', 'Damayanti', 'Geeta', 'Hemlata', 'Indira', 'Jyoti',
  'Kalpana', 'Madhuri', 'Nirmala', 'Prabha', 'Rohini', 'Sarika', 'Trupti', 'Yamuna'];
const SURNAMES = ['Patil', 'Deshmukh', 'Jadhav', 'Shinde', 'Pawar', 'More', 'Gaikwad', 'Kulkarni',
  'Joshi', 'Bhosale', 'Chavan', 'Kadam', 'Salunkhe', 'Thorat', 'Sawant', 'Mane',
  'Bhagat', 'Dhumal', 'Ghorpade', 'Ingale', 'Kale', 'Lokhande', 'Nikam', 'Pingale',
  'Rane', 'Shelke', 'Tambe', 'Wagh', 'Bagal', 'Dabhade', 'Gadekar', 'Hande'];
const MIDDLE = ['Baban', 'Dattatray', 'Ganpat', 'Hari', 'Kisan', 'Laxman', 'Maruti', 'Namdev',
  'Pandurang', 'Rajaram', 'Shankar', 'Trimbak', 'Vasant', 'Waman', 'Yashwant', 'Bhau'];

const pick = (arr, i) => arr[i % arr.length];
const dryRun = process.argv.includes('--dry-run');

const db = getDb();

// Ordering by created_at reproduces the order seed-scale.js inserted them in,
// so a patient keeps roughly the name their record was built around.
const patients = db
  .prepare('SELECT id, name, gender, user_id FROM patients ORDER BY created_at, id')
  .all();

const renames = [];
const taken = new Set(
  patients.filter((p) => p.user_id).map((p) => p.name)
);

patients.forEach((patient, i) => {
  // Demo login accounts are named in the docs; leave those rows alone.
  if (patient.user_id) return;

  const female = (patient.gender || '').toUpperCase() === 'FEMALE';
  const nameIndex = Math.floor(i / 2);
  const first = female ? pick(FIRST_F, nameIndex) : pick(FIRST_M, nameIndex);
  const surname = pick(SURNAMES, nameIndex + Math.floor(nameIndex / SURNAMES.length));
  const middle = pick(MIDDLE, nameIndex + Math.floor(nameIndex / MIDDLE.length));

  let candidate = `${first} ${middle} ${surname}`;
  // The pools are large enough that this should not fire, but a collision must
  // never silently reintroduce the duplicate names this script exists to remove.
  let suffix = 1;
  while (taken.has(candidate)) {
    candidate = `${first} ${pick(MIDDLE, nameIndex + suffix)} ${surname}`;
    suffix++;
    if (suffix > MIDDLE.length) {
      candidate = `${first} ${middle} ${pick(SURNAMES, nameIndex + suffix)}`;
    }
  }

  taken.add(candidate);
  if (candidate !== patient.name) renames.push({ id: patient.id, from: patient.name, to: candidate });
});

console.log(`Patients: ${patients.length}`);
console.log(`Renaming: ${renames.length}${dryRun ? ' (dry run — nothing written)' : ''}`);
renames.slice(0, 10).forEach((r) => console.log(`  ${r.from}  ->  ${r.to}`));
if (renames.length > 10) console.log(`  … and ${renames.length - 10} more`);

if (!dryRun && renames.length) {
  const update = db.prepare('UPDATE patients SET name = ?, updated_at = ? WHERE id = ?');
  const ts = new Date().toISOString();
  transaction(() => {
    for (const r of renames) update.run(r.to, ts, r.id);
  });

  const remaining = db
    .prepare('SELECT COUNT(*) c FROM (SELECT name FROM patients GROUP BY name HAVING COUNT(*) > 1)')
    .get().c;
  console.log(`Duplicate names remaining: ${remaining}`);
}
