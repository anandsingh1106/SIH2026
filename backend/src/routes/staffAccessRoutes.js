import { Router } from 'express';
import * as ctrl from '../controllers/staffAccessController.js';
import { requireAuth, requireRole, requireVerifiedMfa } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  staffRequestSchema, reviewRequestSchema, listRequestsSchema, setRoleSchema, userIdParamSchema,
} from '../validators/authValidators.js';

const router = Router();

router.use(requireAuth);

// ─── Applicant ──────────────────────────────────────────────────────────────
// A patient asking to become staff. Reachable on an ordinary patient session,
// since that is what every applicant has at this point.

router.post('/requests', validate({ body: staffRequestSchema }), ctrl.postRequest);
router.get('/requests/mine', ctrl.getMyRequest);
router.delete('/requests/:id', validate({ params: idParamSchema }), ctrl.deleteMyRequest);

// ─── Administrator ──────────────────────────────────────────────────────────
// Approving a request hands someone else's health records to a stranger, so
// these require ADMIN *and* a session that actually presented a second factor.
// requireRole alone would let a stolen admin password grant roles.

router.get(
  '/requests',
  requireRole('ADMIN'),
  validate({ query: listRequestsSchema }),
  ctrl.getRequests
);

router.post(
  '/requests/:id/approve',
  requireRole('ADMIN'),
  requireVerifiedMfa,
  validate({ params: idParamSchema, body: reviewRequestSchema }),
  ctrl.postApprove
);

router.post(
  '/requests/:id/reject',
  requireRole('ADMIN'),
  requireVerifiedMfa,
  validate({ params: idParamSchema, body: reviewRequestSchema }),
  ctrl.postReject
);

router.patch(
  '/users/:userId/role',
  requireRole('ADMIN'),
  requireVerifiedMfa,
  validate({ params: userIdParamSchema, body: setRoleSchema }),
  ctrl.patchUserRole
);

export default router;
