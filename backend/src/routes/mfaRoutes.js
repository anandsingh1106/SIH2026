import { Router } from 'express';
import * as ctrl from '../controllers/mfaController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { mfaLimiter } from '../config/rateLimits.js';
import {
  mfaTokenSchema, mfaRecoverySchema, userIdParamSchema,
} from '../validators/authValidators.js';

const router = Router();

/**
 * Two-factor routes.
 *
 * Mounted under /api/auth, which mfaGate exempts — a user who has not yet
 * satisfied 2FA must be able to reach these in order to satisfy it. Each
 * handler therefore performs its own checks rather than relying on the gate.
 */
router.use(requireAuth);

router.get('/status', ctrl.getStatus);

// Finishing enrolment and stepping up are both code-guessing surfaces.
router.post(
  '/enrol/complete',
  mfaLimiter,
  validate({ body: mfaTokenSchema }),
  ctrl.postEnrolComplete
);

router.post('/verify', mfaLimiter, validate({ body: mfaTokenSchema }), ctrl.postVerify);

router.post('/recovery', mfaLimiter, validate({ body: mfaRecoverySchema }), ctrl.postRecovery);

router.post('/recovery-codes', ctrl.postRegenerateRecoveryCodes);

// Admin reset. requireRole is not sufficient on its own here: the controller
// additionally requires the acting admin's own session to be aal2, so a stolen
// admin password cannot strip 2FA from other accounts.
router.post(
  '/reset/:userId',
  requireRole('ADMIN'),
  validate({ params: userIdParamSchema }),
  ctrl.postAdminReset
);

export default router;
