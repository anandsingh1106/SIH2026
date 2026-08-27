import crypto from 'crypto';
import { getDb, transaction } from '../db/connection.js';
import { recordAudit } from './auditService.js';
import { notify } from './notificationService.js';
import { NotFoundError, ConflictError, AuthorizationError, ValidationError } from '../utils/errors.js';

const MANAGE_ROLES = ['DOCTOR', 'ADMIN'];
const now = () => new Date().toISOString();

function assertCanManage(user) {
  if (!MANAGE_ROLES.includes(user.role)) {
    throw new AuthorizationError('Only pharmacy and administrative staff can change stock.');
  }
}

export function listInventory({ facilityId, medicineId, lowStock, expiringBefore, page = 1, limit = 50 } = {}) {
  const db = getDb();
  const where = [];
  const params = [];

  if (facilityId) { where.push('i.facility_id = ?'); params.push(facilityId); }
  if (medicineId) { where.push('i.medicine_id = ?'); params.push(medicineId); }
  if (lowStock) where.push('i.quantity <= i.reorder_level');
  if (expiringBefore) { where.push('i.expiry_date IS NOT NULL AND i.expiry_date <= ?'); params.push(expiringBefore); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM inventory i ${whereSql}`).get(...params).c;
  const items = db
    .prepare(`
      SELECT i.*, m.name AS medicine_name, m.generic_name, m.strength, f.name AS facility_name
      FROM inventory i
      LEFT JOIN medicines m ON m.id = i.medicine_id
      LEFT JOIN facilities f ON f.id = i.facility_id
      ${whereSql} ORDER BY m.name ASC LIMIT ? OFFSET ?
    `)
    .all(...params, limit, (page - 1) * limit);

  return { items, total };
}

/**
 * Availability of the medicines on a prescription, for the patient who owns it.
 *
 * Prescriptions record a dispensing label ("Tab Paracetamol 500mg") while the
 * catalogue stores the drug name ("Paracetamol"), so each item is matched on
 * the catalogue name appearing within the label.
 */
export function getPrescriptionAvailability(user, prescriptionId) {
  const db = getDb();

  const prescription = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(prescriptionId);
  if (!prescription) throw new NotFoundError('Prescription');

  // A patient may only see availability for their own prescription.
  if (user.role === 'PATIENT') {
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id);
    if (!patient || patient.id !== prescription.patient_id) {
      throw new AuthorizationError('You can only view your own prescriptions.');
    }
  }

  const items = db
    .prepare('SELECT * FROM prescription_items WHERE prescription_id = ?')
    .all(prescriptionId);

  const stock = db
    .prepare(`
      SELECT m.name AS medicine_name, i.quantity, i.unit_price, i.facility_id,
             f.name AS facility_name
      FROM inventory i
      JOIN medicines m ON m.id = i.medicine_id
      LEFT JOIN facilities f ON f.id = i.facility_id
      WHERE i.quantity > 0
    `)
    .all();

  return items.map((item) => {
    const label = (item.medicine_name || '').toLowerCase();
    const match = stock.find((s) => label.includes((s.medicine_name || '').toLowerCase()));

    return {
      medicineName: item.medicine_name,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      quantity: item.quantity,
      available: Boolean(match),
      inStock: match ? match.quantity : 0,
      unitPrice: match ? match.unit_price : null,
      estimatedCost: match && item.quantity ? Number((match.unit_price * item.quantity).toFixed(2)) : null,
      facilityName: match ? match.facility_name : null,
      facilityId: match ? match.facility_id : null,
    };
  });
}

/**
 * Places a patient's request to collect prescribed medicines from a pharmacy.
 *
 * Stock is not decremented here: the pharmacist dispenses and adjusts stock,
 * which keeps the audit trail honest about who actually handed the drugs over.
 */
export function requestMedicineOrder(user, { prescriptionId, items, facilityId }, requestMeta = {}) {
  if (user.role !== 'PATIENT') {
    throw new AuthorizationError('Only patients can request their own medicines.');
  }
  if (!items?.length) {
    throw new ValidationError('Select at least one medicine to order.');
  }

  return transaction((db) => {
    const patient = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(user.id);
    if (!patient) throw new NotFoundError('Patient');

    const prescription = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(prescriptionId);
    if (!prescription) throw new NotFoundError('Prescription');
    if (prescription.patient_id !== patient.id) {
      throw new AuthorizationError('You can only order against your own prescription.');
    }

    const targetFacility = facilityId ?? prescription.facility_id;
    const orderCode = `RX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const summary = items.map((i) => `${i.medicineName} x${i.quantity}`).join(', ');

    // Pharmacy staff work the counter at the facility, so the request is
    // broadcast there rather than to one named user.
    notify({
      facilityId: targetFacility,
      role: 'DOCTOR',
      type: 'MEDICINE_ORDER',
      title: `Medicine collection request: ${patient.name}`,
      message: `${summary}. Order ${orderCode}.`,
      priority: 'HIGH',
      metadata: { orderCode, prescriptionId, patientId: patient.id },
      link: '/doctor/inventory',
    }, db);

    // The patient keeps the token in their own notification feed.
    if (patient.user_id) {
      notify({
        userId: patient.user_id,
        type: 'MEDICINE_ORDER',
        title: `Medicine order ${orderCode} placed`,
        message: `Show this token at the pharmacy counter to collect: ${summary}.`,
        priority: 'NORMAL',
        metadata: { orderCode, prescriptionId },
        link: '/patient/medicine-orders',
      }, db);
    }

    recordAudit(
      { actorId: user.id, action: 'REQUEST_MEDICINE_ORDER', entityType: 'prescription',
        entityId: prescriptionId, newValues: { orderCode, itemCount: items.length }, ...requestMeta },
      db
    );

    return { orderCode, prescriptionId, items, placedAt: now(), status: 'REQUESTED' };
  });
}

export function createInventoryItem(user, input, requestMeta = {}) {
  assertCanManage(user);

  return transaction((db) => {
    if (!db.prepare('SELECT 1 FROM medicines WHERE id = ?').get(input.medicineId)) {
      throw new NotFoundError('Medicine');
    }
    if (!db.prepare('SELECT 1 FROM facilities WHERE id = ?').get(input.facilityId)) {
      throw new NotFoundError('Facility');
    }

    const id = crypto.randomUUID();
    const ts = now();
    db.prepare(`
      INSERT INTO inventory (id, medicine_id, facility_id, batch_number, expiry_date,
        quantity, reorder_level, unit_price, supplier, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.medicineId, input.facilityId, input.batchNumber ?? null,
           input.expiryDate ?? null, input.quantity ?? 0, input.reorderLevel ?? 0,
           input.unitPrice ?? null, input.supplier ?? null, ts, ts);

    if (input.quantity > 0) {
      db.prepare(`
        INSERT INTO inventory_transactions (id, inventory_id, type, quantity,
          quantity_before, quantity_after, reason, performed_by, created_at)
        VALUES (?, ?, 'STOCK_IN', ?, 0, ?, 'Initial stock', ?, ?)
      `).run(crypto.randomUUID(), id, input.quantity, input.quantity, user.id, ts);
    }

    recordAudit(
      { actorId: user.id, action: 'CREATE_INVENTORY', entityType: 'inventory', entityId: id,
        newValues: { medicineId: input.medicineId, quantity: input.quantity }, ...requestMeta },
      db
    );

    return db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
  });
}

/**
 * Applies a stock movement inside a transaction.
 *
 * The balance is re-read inside the transaction and checked before writing, so
 * two concurrent stock-outs cannot both pass. The CHECK (quantity >= 0)
 * constraint is the final backstop against a negative balance.
 */
export function adjustStock(user, inventoryId, { type, quantity, reason, referenceId }, requestMeta = {}) {
  assertCanManage(user);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError('Quantity must be a positive whole number.');
  }

  return transaction((db) => {
    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(inventoryId);
    if (!item) throw new NotFoundError('Inventory item');

    const isOutward = ['STOCK_OUT', 'TRANSFER_OUT', 'EXPIRED'].includes(type);
    const delta = isOutward ? -quantity : quantity;
    const after = item.quantity + delta;

    if (after < 0) {
      throw new ConflictError(
        `Insufficient stock: ${item.quantity} available, ${quantity} requested.`,
        { available: item.quantity, requested: quantity }
      );
    }

    db.prepare('UPDATE inventory SET quantity = ?, updated_at = ? WHERE id = ?')
      .run(after, now(), inventoryId);

    db.prepare(`
      INSERT INTO inventory_transactions (id, inventory_id, type, quantity,
        quantity_before, quantity_after, reason, reference_id, performed_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), inventoryId, type, quantity, item.quantity, after,
           reason ?? null, referenceId ?? null, user.id, now());

    // Warn once the balance crosses the reorder threshold.
    if (after <= item.reorder_level && item.quantity > item.reorder_level) {
      const medicine = db.prepare('SELECT name FROM medicines WHERE id = ?').get(item.medicine_id);
      notify({
        role: 'ADMIN', facilityId: item.facility_id,
        type: 'LOW_STOCK', priority: 'HIGH',
        title: `Low stock: ${medicine?.name || 'medicine'}`,
        message: `Only ${after} units remain (reorder level ${item.reorder_level}).`,
        metadata: { inventoryId }, link: '/admin/inventory',
      }, db);
    }

    recordAudit(
      { actorId: user.id, action: `INVENTORY_${type}`, entityType: 'inventory', entityId: inventoryId,
        oldValues: { quantity: item.quantity }, newValues: { quantity: after }, ...requestMeta },
      db
    );

    return db.prepare('SELECT * FROM inventory WHERE id = ?').get(inventoryId);
  });
}

/** Moves stock between facilities as one atomic operation. */
export function transferStock(user, input, requestMeta = {}) {
  assertCanManage(user);

  return transaction((db) => {
    const source = db
      .prepare('SELECT * FROM inventory WHERE medicine_id = ? AND facility_id = ? ORDER BY quantity DESC')
      .get(input.medicineId, input.fromFacilityId);
    if (!source) throw new NotFoundError('Source inventory');

    if (source.quantity < input.quantity) {
      throw new ConflictError(
        `Insufficient stock at the source facility: ${source.quantity} available.`,
        { available: source.quantity, requested: input.quantity }
      );
    }

    const ts = now();

    db.prepare('UPDATE inventory SET quantity = quantity - ?, updated_at = ? WHERE id = ?')
      .run(input.quantity, ts, source.id);
    db.prepare(`
      INSERT INTO inventory_transactions (id, inventory_id, type, quantity,
        quantity_before, quantity_after, reason, performed_by, created_at)
      VALUES (?, ?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), source.id, input.quantity, source.quantity,
           source.quantity - input.quantity, input.notes ?? 'Stock transfer', user.id, ts);

    // Land the stock in a matching batch at the destination, or open one.
    let destination = db
      .prepare('SELECT * FROM inventory WHERE medicine_id = ? AND facility_id = ? AND (batch_number IS ? OR batch_number = ?)')
      .get(input.medicineId, input.toFacilityId, source.batch_number, source.batch_number);

    if (destination) {
      db.prepare('UPDATE inventory SET quantity = quantity + ?, updated_at = ? WHERE id = ?')
        .run(input.quantity, ts, destination.id);
      db.prepare(`
        INSERT INTO inventory_transactions (id, inventory_id, type, quantity,
          quantity_before, quantity_after, reason, performed_by, created_at)
        VALUES (?, ?, 'TRANSFER_IN', ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), destination.id, input.quantity, destination.quantity,
             destination.quantity + input.quantity, input.notes ?? 'Stock transfer', user.id, ts);
    } else {
      const destId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO inventory (id, medicine_id, facility_id, batch_number, expiry_date,
          quantity, reorder_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(destId, input.medicineId, input.toFacilityId, source.batch_number,
             source.expiry_date, input.quantity, source.reorder_level, ts, ts);
      db.prepare(`
        INSERT INTO inventory_transactions (id, inventory_id, type, quantity,
          quantity_before, quantity_after, reason, performed_by, created_at)
        VALUES (?, ?, 'TRANSFER_IN', ?, 0, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), destId, input.quantity, input.quantity,
             input.notes ?? 'Stock transfer', user.id, ts);
    }

    const transferId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO stock_transfers (id, medicine_id, from_facility_id, to_facility_id,
        quantity, status, requested_by, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)
    `).run(transferId, input.medicineId, input.fromFacilityId, input.toFacilityId,
           input.quantity, user.id, input.notes ?? null, ts, ts);

    recordAudit(
      { actorId: user.id, action: 'TRANSFER_STOCK', entityType: 'stock_transfer', entityId: transferId,
        newValues: { from: input.fromFacilityId, to: input.toFacilityId, quantity: input.quantity },
        ...requestMeta },
      db
    );

    return db.prepare('SELECT * FROM stock_transfers WHERE id = ?').get(transferId);
  });
}

export function listTransactions({ inventoryId, page = 1, limit = 50 } = {}) {
  const db = getDb();
  const where = inventoryId ? 'WHERE t.inventory_id = ?' : '';
  const params = inventoryId ? [inventoryId] : [];

  const total = db.prepare(`SELECT COUNT(*) AS c FROM inventory_transactions t ${where}`).get(...params).c;
  const items = db
    .prepare(`
      SELECT t.*, u.name AS performed_by_name FROM inventory_transactions t
      LEFT JOIN users u ON u.id = t.performed_by
      ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?
    `)
    .all(...params, limit, (page - 1) * limit);

  return { items, total };
}
