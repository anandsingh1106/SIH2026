import { Router } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import db from './db.js';
import { verifyFirebaseIdToken } from './lib/firebaseAdmin.js';
import { sendWelcomeEmail } from './lib/mailer.js';
import { signToken, COOKIE_MAX_AGE_MS } from './lib/token.js';
import { requireAuth } from './middleware/auth.js';

const router = Router();

const ROLES = ['patient', 'asha', 'doctor', 'specialist', 'admin'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const phoneLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email || undefined,
    phone: row.phone,
    role: row.role,
    district: row.district,
    taluka: row.taluka,
    village: row.village,
    abhaId: row.abha_id || undefined,
    isVerified: true,
  };
}

function setSessionCookie(res, user) {
  const token = signToken(user);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

// ─── POST /api/auth/phone-login ─────────────────────────────────────────────
router.post('/phone-login', phoneLoginLimiter, async (req, res) => {
  const { idToken, name, role, district, taluka, village, abhaId, email } = req.body || {};

  if (!idToken) {
    return res.status(400).json({ error: 'Missing verification token.' });
  }
  if (email && !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch (err) {
    console.error('Firebase token verification failed:', err.message);
    return res.status(401).json({ error: 'Could not verify your phone number. Please try again.' });
  }

  const phone = decoded.phone_number;
  if (!phone) {
    return res.status(400).json({ error: 'No verified phone number found on this session.' });
  }

  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

  if (!user) {
    if (!name || !role || !ROLES.includes(role)) {
      return res.status(400).json({
        error: 'NEW_USER',
        message: 'This phone number is not registered yet. Please complete your profile to create an account.',
        phone,
      });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, name, phone, email, role, district, taluka, village, abha_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, name, phone, email || null, role, district || null, taluka || null, village || null, abhaId || null, now);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (email) {
      sendWelcomeEmail(email, name).catch((err) => console.error('Welcome email failed:', err.message));
    }
  }

  setSessionCookie(res, user);
  res.json({ user: toPublicUser(user) });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ message: 'Logged out.' });
});

export default router;
