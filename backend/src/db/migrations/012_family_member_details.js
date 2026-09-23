/**
 * Details for household members who are not registered patients.
 *
 * A family member was either a link to another patient record or a bare name,
 * so the age, gender and ABHA a patient enters for a child or parent had
 * nowhere to go. A linked member still reads these from the patient record.
 */
export function up(db) {
  db.exec(`
    ALTER TABLE family_members ADD COLUMN date_of_birth TEXT;
    ALTER TABLE family_members ADD COLUMN gender TEXT;
    ALTER TABLE family_members ADD COLUMN abha_id TEXT;
  `);
}
