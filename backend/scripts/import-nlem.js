#!/usr/bin/env node
/**
 * Imports the NLEM 2022 formulary into the medicines table.
 *
 * Idempotent: a medicine is matched on its name (case-insensitively) and
 * updated rather than duplicated, so re-running is safe and the script can be
 * re-run after `backend/src/db/data/nlem2022.js` is extended.
 *
 * Existing rows keep their ids, so prescriptions already written against a
 * medicine are never orphaned — only the metadata is refreshed.
 *
 * Usage:
 *   node scripts/import-nlem.js            apply
 *   node scripts/import-nlem.js --dry-run  report what would change
 */

import { randomUUID } from 'node:crypto';
import { getDb, transaction } from '../src/db/connection.js';
import { NLEM_2022_MEDICINES, NLEM_2022_META } from '../src/db/data/nlem2022.js';

const dryRun = process.argv.includes('--dry-run');
const now = () => new Date().toISOString();

function main() {
  const db = getDb();

  const existing = db.prepare('SELECT id, name FROM medicines').all();
  const byName = new Map(existing.map((row) => [row.name.trim().toLowerCase(), row]));

  const insert = db.prepare(`
    INSERT INTO medicines
      (id, name, generic_name, strength, dosage_form, category, is_essential, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`);

  // A medicine already in the table keeps its id; only metadata is refreshed.
  const update = db.prepare(`
    UPDATE medicines
       SET generic_name = COALESCE(?, generic_name),
           strength     = COALESCE(?, strength),
           dosage_form  = COALESCE(?, dosage_form),
           category     = COALESCE(?, category),
           is_essential = 1,
           updated_at   = ?
     WHERE id = ?`);

  let inserted = 0;
  let updated = 0;

  const apply = () => {
    for (const med of NLEM_2022_MEDICINES) {
      const key = med.name.trim().toLowerCase();
      const found = byName.get(key);
      if (found) {
        if (!dryRun) {
          update.run(
            med.genericName ?? null,
            med.strength ?? null,
            med.dosageForm ?? null,
            med.category ?? null,
            now(),
            found.id
          );
        }
        updated += 1;
      } else {
        if (!dryRun) {
          insert.run(
            randomUUID(),
            med.name,
            med.genericName ?? null,
            med.strength ?? null,
            med.dosageForm ?? null,
            med.category ?? null,
            now(),
            now()
          );
        }
        inserted += 1;
        // Guard against a duplicate name inside the source list itself.
        byName.set(key, { id: 'pending', name: med.name });
      }
    }
  };

  if (dryRun) apply();
  else transaction(apply);

  const total = db.prepare('SELECT COUNT(*) AS c FROM medicines').get().c;

  console.log(
    `${dryRun ? '[dry run] ' : ''}NLEM ${NLEM_2022_META.edition} import — ` +
      `inserted: ${inserted}, updated: ${updated}`
  );
  console.log(`Formulary now holds ${total} medicines.`);
  console.log(
    `NLEM ${NLEM_2022_META.edition} lists ${NLEM_2022_META.totalMedicines} medicines in total; ` +
      `${NLEM_2022_MEDICINES.length} are sourced in this repository ` +
      `(see backend/src/db/data/nlem2022.js for why).`
  );
}

main();
