import { Router } from 'express';
import * as ctrl from '../controllers/ashaController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  listHomeVisitsSchema, createHomeVisitSchema,
  listTasksSchema, createTaskSchema, updateTaskSchema,
  listVaccinationsSchema, scheduleVaccinationSchema, administerVaccinationSchema,
  listMaternalSchema, createMaternalSchema, ancVisitSchema,
  listNcdSchema, createNcdSchema,
} from '../validators/ashaValidators.js';

export const homeVisitRouter = Router();
homeVisitRouter.use(requireAuth);
homeVisitRouter.get('/', validate({ query: listHomeVisitsSchema }), ctrl.getHomeVisits);
homeVisitRouter.post('/', validate({ body: createHomeVisitSchema }), ctrl.postHomeVisit);

export const taskRouter = Router();
taskRouter.use(requireAuth);
taskRouter.get('/', validate({ query: listTasksSchema }), ctrl.getTasks);
taskRouter.post('/', validate({ body: createTaskSchema }), ctrl.postTask);
taskRouter.patch('/:id', validate({ params: idParamSchema, body: updateTaskSchema }), ctrl.patchTask);

export const vaccinationRouter = Router();
vaccinationRouter.use(requireAuth);
vaccinationRouter.get('/', validate({ query: listVaccinationsSchema }), ctrl.getVaccinations);
vaccinationRouter.post('/', validate({ body: scheduleVaccinationSchema }), ctrl.postVaccination);
vaccinationRouter.post('/:id/administer',
  validate({ params: idParamSchema, body: administerVaccinationSchema }), ctrl.postAdministerVaccination);

export const maternalRouter = Router();
maternalRouter.use(requireAuth);
maternalRouter.get('/', validate({ query: listMaternalSchema }), ctrl.getMaternalRecords);
maternalRouter.post('/', validate({ body: createMaternalSchema }), ctrl.postMaternalRecord);
maternalRouter.post('/:id/anc-visits',
  validate({ params: idParamSchema, body: ancVisitSchema }), ctrl.postAncVisit);

export const ncdRouter = Router();
ncdRouter.use(requireAuth);
ncdRouter.get('/', validate({ query: listNcdSchema }), ctrl.getNcdScreenings);
ncdRouter.post('/', validate({ body: createNcdSchema }), ctrl.postNcdScreening);
