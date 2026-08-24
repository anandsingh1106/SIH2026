/**
 * Phase 5/6 — inventory and supply chain, plus document metadata.
 */
export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
      facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      batch_number TEXT,
      expiry_date TEXT,
      quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      reorder_level INTEGER NOT NULL DEFAULT 0,
      unit_price REAL,
      supplier TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (medicine_id, facility_id, batch_number)
    );
    CREATE INDEX IF NOT EXISTS idx_inv_medicine ON inventory(medicine_id);
    CREATE INDEX IF NOT EXISTS idx_inv_facility ON inventory(facility_id);
    CREATE INDEX IF NOT EXISTS idx_inv_expiry ON inventory(expiry_date);

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      inventory_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('STOCK_IN','STOCK_OUT','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT','EXPIRED')),
      quantity INTEGER NOT NULL,
      quantity_before INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      reason TEXT,
      reference_id TEXT,
      performed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_inv_tx_inventory ON inventory_transactions(inventory_id);
    CREATE INDEX IF NOT EXISTS idx_inv_tx_created ON inventory_transactions(created_at);

    CREATE TABLE IF NOT EXISTS stock_transfers (
      id TEXT PRIMARY KEY,
      medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
      from_facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      to_facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      status TEXT NOT NULL DEFAULT 'COMPLETED'
        CHECK (status IN ('REQUESTED','APPROVED','COMPLETED','CANCELLED')),
      requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transfers_from ON stock_transfers(from_facility_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_to ON stock_transfers(to_facility_id);

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      document_type TEXT NOT NULL,
      filename TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_docs_patient ON documents(patient_id);

    -- Idempotency ledger for the offline sync endpoint (§30).
    CREATE TABLE IF NOT EXISTS sync_operations (
      operation_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entity TEXT NOT NULL,
      action TEXT NOT NULL,
      server_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('SUCCESS','FAILED')),
      error TEXT,
      client_timestamp TEXT,
      processed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_user ON sync_operations(user_id);
  `);
}
