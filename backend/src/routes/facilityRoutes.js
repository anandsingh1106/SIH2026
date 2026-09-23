import { Router } from 'express';
import * as ctrl from '../controllers/facilityController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  listFacilitiesSchema, createFacilitySchema, updateFacilitySchema,
} from '../validators/facilityValidators.js';

// The facility registry. The public directory at /api/public/facilities stays
// read-only; registering, editing and closing a facility is an admin action.
const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validate({ query: listFacilitiesSchema }), ctrl.getFacilities);
router.post('/', validate({ body: createFacilitySchema }), ctrl.postFacility);
router.get('/:id', validate({ params: idParamSchema }), ctrl.getFacility);
router.patch('/:id', validate({ params: idParamSchema, body: updateFacilitySchema }), ctrl.patchFacility);

export default router;
