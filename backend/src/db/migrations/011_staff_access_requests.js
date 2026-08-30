/**
 * Staff access requests.
 *
 * Public signup always creates a PATIENT. Anyone claiming a clinical role files
 * a request here instead, and an administrator decides. Before this, the role
 * came straight off the signup form, so anyone could self-register as ADMIN and
 * read every patient record in the state.
 *
 * The request records the credential the applicant is claiming (HPR ID for
 * clinicians, employee ID for ASHA workers and administrators) so a reviewer
 * has something to verify against the official register rather than approving
 * on a name alone.
 */
export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_access_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      requested_role TEXT NOT NULL CHECK (requested_role IN ('ASHA','DOCTOR','SPECIALIST','ADMIN')),

      -- What the applicant claims, for the reviewer to check.
      registration_number TEXT,
      facility_id TEXT,
      facility_name TEXT,
      designation TEXT,
      note TEXT,

      status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','APPROVED','REJECTED','WITHDRAWN')),

      -- Who decided, when, and why. A rejection reason is shown to the
      -- applicant; an approval is the audit trail for granting patient access.
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_note TEXT,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_staff_req_status ON staff_access_requests(status, created_at);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_staff_req_user ON staff_access_requests(user_id);');

  // One open request per person: without this, a repeated submit floods the
  // review queue with duplicates of the same application.
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_req_one_pending
    ON staff_access_requests(user_id) WHERE status = 'PENDING';
  `);
}
