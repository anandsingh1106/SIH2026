import { Router } from 'express';
import * as ctrl from '../controllers/patientController.js';
import * as clinicalCtrl from '../controllers/clinicalController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  listPatientsSchema, createPatientSchema, updatePatientSchema,
  allergySchema, chronicConditionSchema, familyMemberSchema,
} from '../validators/patientValidators.js';
import { vitalsSchema, listVitalsSchema } from '../validators/clinicalValidators.js';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: listPatientsSchema }), ctrl.getPatients);
router.post('/', validate({ body: createPatientSchema }), ctrl.postPatient);
router.get('/:id', validate({ params: idParamSchema }), ctrl.getPatientById);
router.patch('/:id', validate({ params: idParamSchema, body: updatePatientSchema }), ctrl.patchPatient);

router.post('/:id/allergies', validate({ params: idParamSchema, body: allergySchema }), ctrl.postAllergy);
router.post('/:id/chronic-conditions',
  validate({ params: idParamSchema, body: chronicConditionSchema }), ctrl.postChronicCondition);

router.get('/:id/family', validate({ params: idParamSchema }), ctrl.getFamilyMembers);
router.post('/:id/family', validate({ params: idParamSchema, body: familyMemberSchema }), ctrl.postFamilyMember);

router.get('/:id/vitals', validate({ params: idParamSchema, query: listVitalsSchema }), clinicalCtrl.getVitals);
router.post('/:id/vitals', validate({ params: idParamSchema, body: vitalsSchema }), clinicalCtrl.postVitals);

export default router;
