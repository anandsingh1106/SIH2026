/**
 * Two-factor authentication state.
 *
 * The TOTP secret itself lives in Supabase, which owns factor enrolment and
 * code verification. What we keep here is the policy state we must be able to
 * reason about without a round trip: whether a user has completed enrolment,
 * and their single-use recovery codes.
 *
 * Recovery codes are stored only as SHA-256 hashes. They are bearer credentials
 * equivalent to a second factor, so a database leak must not yield usable ones.
 * Plain codes are shown to the user exactly once, at generation.
 */
export function up(db) {
  const columns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);

  // Mirrors Supabase enrolment so policy checks and admin screens do not need
  // a round trip per user. Supabase remains the source of truth for the factor.
  if (!columns.includes('mfa_enrolled_at')) {
    db.exec('ALTER TABLE users ADD COLUMN mfa_enrolled_at TEXT;');
  }

  // Set when an admin resets a user's 2FA, so the event is visible on the row
  // itself and not only in the audit log.
  if (!columns.includes('mfa_reset_at')) {
    db.exec('ALTER TABLE users ADD COLUMN mfa_reset_at TEXT;');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      -- SHA-256 of the code. Never the code itself.
      code_hash TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_mfa_codes_user ON mfa_recovery_codes(user_id);');
  // Lookup is by hash within a user; unused codes are the only candidates.
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_mfa_codes_lookup ON mfa_recovery_codes(user_id, code_hash, used_at);'
  );
}
