import * as inventory from '../services/inventoryService.js';
import * as messaging from '../services/messagingService.js';
import * as sync from '../services/syncService.js';
import * as analytics from '../services/analyticsService.js';
import * as queue from '../services/queueService.js';
import { assessTriage, assistantReply } from '../services/ai/triageService.js';
import { checkInteractions } from '../services/ai/drugInteractionService.js';
import { getDb } from '../db/connection.js';
import { AuthorizationError } from '../utils/errors.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

function meta(req) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') };
}

// ─── Inventory ──────────────────────────────────────────────────────────────

const toPublicInventory = (r) => ({
  id: r.id,
  medicineId: r.medicine_id,
  name: r.medicine_name || undefined,
  genericName: r.generic_name || undefined,
  strength: r.strength || undefined,
  facilityId: r.facility_id,
  facilityName: r.facility_name || undefined,
  batchNumber: r.batch_number || undefined,
  expiryDate: r.expiry_date || undefined,
  stock: r.quantity,
  reorderLevel: r.reorder_level,
  isLow: r.quantity <= r.reorder_level,
  unitPrice: r.unit_price ?? undefined,
  supplier: r.supplier || undefined,
});

export function getInventory(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = inventory.listInventory({ ...filters, page, limit });
    return sendPaginated(res, items.map(toPublicInventory), { page, limit, total });
  } catch (err) { next(err); }
}

export function postInventory(req, res, next) {
  try {
    const row = inventory.createInventoryItem(req.user, req.body, meta(req));
    return sendSuccess(res, toPublicInventory(row), 201);
  } catch (err) { next(err); }
}

export function postStockAdjustment(req, res, next) {
  try {
    const row = inventory.adjustStock(req.user, req.params.id, req.body, meta(req));
    return sendSuccess(res, toPublicInventory(row));
  } catch (err) { next(err); }
}

export function postTransfer(req, res, next) {
  try {
    const row = inventory.transferStock(req.user, req.body, meta(req));
    return sendSuccess(res, {
      id: row.id, medicineId: row.medicine_id, from: row.from_facility_id,
      to: row.to_facility_id, quantity: row.quantity, status: row.status,
    }, 201);
  } catch (err) { next(err); }
}

export function getInventoryTransactions(req, res, next) {
  try {
    const { page, limit } = req.validatedQuery;
    const { items, total } = inventory.listTransactions({ inventoryId: req.params.id, page, limit });
    return sendPaginated(res, items.map((t) => ({
      id: t.id, type: t.type, quantity: t.quantity,
      before: t.quantity_before, after: t.quantity_after,
      reason: t.reason || undefined, by: t.performed_by_name || undefined,
      at: t.created_at,
    })), { page, limit, total });
  } catch (err) { next(err); }
}

// ─── Messaging ──────────────────────────────────────────────────────────────

export function getConversations(req, res, next) {
  try {
    const { page, limit } = req.validatedQuery;
    const { items, total } = messaging.listConversations(req.user, { page, limit });
    return sendPaginated(res, items.map((c) => ({
      id: c.id, subject: c.subject || undefined, patientId: c.patient_id || undefined,
      lastMessage: c.last_message || undefined, unreadCount: c.unread_count,
      updatedAt: c.updated_at,
    })), { page, limit, total });
  } catch (err) { next(err); }
}

export function postConversation(req, res, next) {
  try {
    const row = messaging.createConversation(req.user, req.body, meta(req));
    return sendSuccess(res, { id: row.id, subject: row.subject || undefined }, 201);
  } catch (err) { next(err); }
}

export function getMessages(req, res, next) {
  try {
    const { page, limit } = req.validatedQuery;
    const { items, total } = messaging.listMessages(req.user, req.params.id, { page, limit });
    return sendPaginated(res, items.map((m) => ({
      id: m.id, conversationId: m.conversation_id, senderId: m.sender_id || undefined,
      senderName: m.sender_name || undefined,
      senderRole: m.sender_role ? String(m.sender_role).toLowerCase() : undefined,
      text: m.body, isRead: !!m.read, timestamp: m.created_at,
    })), { page, limit, total });
  } catch (err) { next(err); }
}

export function postMessage(req, res, next) {
  try {
    const row = messaging.sendMessage(req.user, req.params.id, req.body, meta(req));
    return sendSuccess(res, {
      id: row.id, conversationId: row.conversation_id, text: row.body, timestamp: row.created_at,
    }, 201);
  } catch (err) { next(err); }
}

export function patchMessageRead(req, res, next) {
  try {
    const row = messaging.markMessageRead(req.user, req.params.id);
    return sendSuccess(res, { id: row.id, isRead: !!row.read });
  } catch (err) { next(err); }
}

// ─── Offline sync ───────────────────────────────────────────────────────────

export function postSyncBatch(req, res, next) {
  try {
    const result = sync.processSyncBatch(req.user, req.body.operations, meta(req));
    return sendSuccess(res, result);
  } catch (err) { next(err); }
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export function getAnalytics(scope) {
  return (req, res, next) => {
    try {
      switch (scope) {
        case 'patient': return sendSuccess(res, analytics.patientAnalytics(req.user));
        case 'asha': return sendSuccess(res, analytics.ashaAnalytics(req.user));
        case 'doctor': return sendSuccess(res, analytics.doctorAnalytics(req.user));
        case 'specialist': return sendSuccess(res, analytics.specialistAnalytics(req.user));
        case 'admin': return sendSuccess(res, analytics.adminAnalytics(req.user, req.validatedQuery));
        default: return sendSuccess(res, {});
      }
    } catch (err) { next(err); }
  };
}

export function getHeatmap(req, res, next) {
  try {
    return sendSuccess(res, analytics.heatmapData(req.user, req.validatedQuery));
  } catch (err) { next(err); }
}

// ─── OPD queue ──────────────────────────────────────────────────────────────

const toPublicToken = (t) => ({
  id: t.id,
  facilityId: t.facility_id,
  patientId: t.patient_id,
  patientName: t.patient_name || undefined,
  doctorName: t.doctor_name || undefined,
  tokenNumber: t.token_number,
  status: t.status,
  position: t.position,
  queueDate: t.queue_date,
});

export function postToken(req, res, next) {
  try {
    const row = queue.issueToken(req.user, req.body, meta(req));
    return sendSuccess(res, toPublicToken(row), 201);
  } catch (err) { next(err); }
}

export function getQueue(req, res, next) {
  try {
    const result = queue.getQueue(req.params.facilityId, {});
    return sendSuccess(res, { ...result, items: result.items.map(toPublicToken) });
  } catch (err) { next(err); }
}

export function getTokenPosition(req, res, next) {
  try {
    return sendSuccess(res, toPublicToken(queue.tokenPosition(req.params.tokenId)));
  } catch (err) { next(err); }
}

export function queueAction(status) {
  return (req, res, next) => {
    try {
      const row = queue.updateTokenStatus(req.user, req.params.tokenId, status, meta(req));
      return sendSuccess(res, toPublicToken(row));
    } catch (err) { next(err); }
  };
}

// ─── AI ─────────────────────────────────────────────────────────────────────

export async function postTriage(req, res, next) {
  try {
    return sendSuccess(res, await assessTriage(req.body));
  } catch (err) { next(err); }
}

export async function postAssistant(req, res, next) {
  try {
    return sendSuccess(res, await assistantReply(req.body));
  } catch (err) { next(err); }
}

export function postDrugInteractions(req, res, next) {
  try {
    return sendSuccess(res, checkInteractions(req.body.medicines));
  } catch (err) { next(err); }
}

// ─── Audit logs ─────────────────────────────────────────────────────────────

export function getAuditLogs(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      throw new AuthorizationError('Audit logs are restricted to administrators.');
    }

    const db = getDb();
    const { page, limit, actorId, entityType, action } = req.validatedQuery;
    const where = [];
    const params = [];
    if (actorId) { where.push('a.actor_id = ?'); params.push(actorId); }
    if (entityType) { where.push('a.entity_type = ?'); params.push(entityType); }
    if (action) { where.push('a.action = ?'); params.push(action); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS c FROM audit_logs a ${whereSql}`).get(...params).c;
    const items = db
      .prepare(`
        SELECT a.*, u.name AS actor_name, u.role AS actor_role
        FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
        ${whereSql} ORDER BY a.created_at DESC LIMIT ? OFFSET ?
      `)
      .all(...params, limit, (page - 1) * limit);

    return sendPaginated(res, items.map((a) => ({
      id: a.id,
      userId: a.actor_id || undefined,
      userName: a.actor_name || undefined,
      userRole: a.actor_role ? String(a.actor_role).toLowerCase() : undefined,
      action: a.action,
      resource: a.entity_type,
      resourceId: a.entity_id || undefined,
      ipAddress: a.ip_address || undefined,
      timestamp: a.created_at,
    })), { page, limit, total });
  } catch (err) { next(err); }
}
