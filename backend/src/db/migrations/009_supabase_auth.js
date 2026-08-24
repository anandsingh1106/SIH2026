/**
 * Adds auth_user_id (Supabase) alongside the legacy firebase_uid column.
 *
 * A full table rebuild is deliberately avoided: renaming `users` makes SQLite
 * rewrite every other table's foreign key to the temporary name, and that
 * rewrite is not prevented by legacy_alter_table or foreign_keys=OFF. Adding a
 * column leaves all existing references intact.
 *
 * firebase_uid is left in place but unused; it is dropped in a later migration
 * once no deployment still reads it.
 */
export function up(db) {
  const columns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);

  if (!columns.includes('auth_user_id')) {
    db.exec('ALTER TABLE users ADD COLUMN auth_user_id TEXT;');
    // UNIQUE cannot be added inline by ALTER TABLE, so it comes from the index.
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth ON users(auth_user_id);');
  }

  db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
}
