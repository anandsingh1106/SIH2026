/**
 * Specialist treatment plans.
 *
 * A plan is the longer-term pathway a specialist sets for a referred patient,
 * split into phases the PHC team works through, with directives for the
 * medical officer and ASHA who carry it out locally.
 *
 * Migration 008 created an earlier treatment_plans table, with the phases as a
 * text blob and no review status, that nothing ever read or wrote. It is
 * replaced here. Should a database hold rows in it anyway, they are kept
 * under a new name rather than dropped.
 */
export function up(db) {
  const legacy = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'treatment_plans'")
    .get();
  if (legacy) {
    const rows = db.prepare('SELECT COUNT(*) AS c FROM treatment_plans').get().c;
    db.exec('DROP INDEX IF EXISTS idx_plans_patient;');
    db.exec(rows > 0
      ? 'ALTER TABLE treatment_plans RENAME TO treatment_plans_legacy;'
      : 'DROP TABLE treatment_plans;');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS treatment_plans (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      referral_id TEXT REFERENCES referrals(id) ON DELETE SET NULL,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      specialty TEXT,
      directives TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'ACTIVE','REVIEW_REQUIRED','COMPLETED','CANCELLED'
      )),
      start_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patient_id);
    CREATE INDEX IF NOT EXISTS idx_treatment_plans_author ON treatment_plans(created_by);

    CREATE TABLE IF NOT EXISTS treatment_plan_phases (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      completed_at TEXT,
      completed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE (plan_id, position)
    );
    CREATE INDEX IF NOT EXISTS idx_treatment_plan_phases_plan ON treatment_plan_phases(plan_id);
  `);
}
