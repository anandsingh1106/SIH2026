import { Router } from 'express';
import * as ctrl from '../controllers/treatmentPlanController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  listPlansSchema, createPlanSchema, updatePlanSchema, phaseParamSchema, phaseUpdateSchema,
} from '../validators/treatmentPlanValidators.js';

// Role and patient-access checks live in the service, next to the queries
// they scope, the same way the other clinical modules do it.
const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listPlansSchema }), ctrl.getPlans);
router.post('/', validate({ body: createPlanSchema }), ctrl.postPlan);
router.get('/:id', validate({ params: idParamSchema }), ctrl.getPlan);
router.patch('/:id', validate({ params: idParamSchema, body: updatePlanSchema }), ctrl.patchPlan);
router.patch(
  '/:id/phases/:phaseId',
  validate({ params: phaseParamSchema, body: phaseUpdateSchema }),
  ctrl.patchPhase
);

export default router;
