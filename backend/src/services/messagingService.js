import crypto from 'crypto';
import { getDb, transaction } from '../db/connection.js';
import { notify } from './notificationService.js';
import { NotFoundError, AuthorizationError } from '../utils/errors.js';

const now = () => new Date().toISOString();

function assertMember(conversationId, userId, db) {
  const member = db
    .prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
    .get(conversationId, userId);
  // 404 rather than 403 so non-members cannot confirm a conversation exists.
  if (!member) throw new NotFoundError('Conversation');
}

export function listConversations(user, { page = 1, limit = 20 } = {}) {
  const db = getDb();
  const total = db
    .prepare('SELECT COUNT(*) AS c FROM conversation_members WHERE user_id = ?')
    .get(user.id).c;

  const items = db
    .prepare(`
      SELECT c.*,
             (SELECT body FROM messages m WHERE m.conversation_id = c.id
              ORDER BY m.created_at DESC LIMIT 1) AS last_message,
             (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id
              AND m.read = 0 AND m.sender_id != ?) AS unread_count
      FROM conversations c
      JOIN conversation_members cm ON cm.conversation_id = c.id
      WHERE cm.user_id = ?
      ORDER BY c.updated_at DESC LIMIT ? OFFSET ?
    `)
    .all(user.id, user.id, limit, (page - 1) * limit);

  return { items, total };
}

export function createConversation(user, { subject, patientId, memberIds = [] }, requestMeta = {}) {
  return transaction((db) => {
    const id = crypto.randomUUID();
    const ts = now();

    db.prepare(`
      INSERT INTO conversations (id, subject, patient_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, subject ?? null, patientId ?? null, user.id, ts, ts);

    // The creator is always a member.
    const unique = [...new Set([user.id, ...memberIds])];
    const addMember = db.prepare(`
      INSERT INTO conversation_members (id, conversation_id, user_id, joined_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const memberId of unique) {
      if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(memberId)) {
        throw new NotFoundError(`User ${memberId}`);
      }
      addMember.run(crypto.randomUUID(), id, memberId, ts);
    }

    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  });
}

export function listMessages(user, conversationId, { page = 1, limit = 50 } = {}) {
  const db = getDb();
  assertMember(conversationId, user.id, db);

  const total = db
    .prepare('SELECT COUNT(*) AS c FROM messages WHERE conversation_id = ?')
    .get(conversationId).c;

  const items = db
    .prepare(`
      SELECT m.*, u.name AS sender_name, u.role AS sender_role
      FROM messages m LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC LIMIT ? OFFSET ?
    `)
    .all(conversationId, limit, (page - 1) * limit);

  return { items, total };
}

export function sendMessage(user, conversationId, { body }, requestMeta = {}) {
  return transaction((db) => {
    assertMember(conversationId, user.id, db);

    const id = crypto.randomUUID();
    const ts = now();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, body, read, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(id, conversationId, user.id, body, ts);

    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(ts, conversationId);

    const recipients = db
      .prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?')
      .all(conversationId, user.id);

    for (const r of recipients) {
      notify({
        userId: r.user_id, type: 'MESSAGE',
        title: `New message from ${user.name}`,
        message: body.slice(0, 140),
        metadata: { conversationId }, link: '/messages',
      }, db);
    }

    return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  });
}

export function markMessageRead(user, messageId) {
  const db = getDb();
  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
  if (!message) throw new NotFoundError('Message');
  assertMember(message.conversation_id, user.id, db);

  db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(messageId);
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
}
