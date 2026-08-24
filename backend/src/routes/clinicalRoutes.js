import { Router } from 'express';
import * as ctrl from '../controllers/clinicalController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  listConsultationsSchema, createConsultationSchema, updateConsultationSchema,
  listPrescriptionsSchema, createPrescriptionSchema, updatePrescriptionSchema,
  listMedicinesSchema, createMedicineSchema,
} from '../validators/clinicalValidators.js';

export const consultationRouter = Router();
consultationRouter.use(requireAuth);
consultationRouter.get('/', validate({ query: listConsultationsSchema }), ctrl.getConsultations);
consultationRouter.post('/', validate({ body: createConsultationSchema }), ctrl.postConsultation);
consultationRouter.get('/:id', validate({ params: idParamSchema }), ctrl.getConsultationById);
consultationRouter.patch('/:id',
  validate({ params: idParamSchema, body: updateConsultationSchema }), ctrl.patchConsultation);

export const prescriptionRouter = Router();
prescriptionRouter.use(requireAuth);
prescriptionRouter.get('/', validate({ query: listPrescriptionsSchema }), ctrl.getPrescriptions);
prescriptionRouter.post('/', validate({ body: createPrescriptionSchema }), ctrl.postPrescription);
prescriptionRouter.get('/:id', validate({ params: idParamSchema }), ctrl.getPrescriptionById);
prescriptionRouter.patch('/:id',
  validate({ params: idParamSchema, body: updatePrescriptionSchema }), ctrl.patchPrescription);

export const medicineRouter = Router();
medicineRouter.use(requireAuth);
medicineRouter.get('/', validate({ query: listMedicinesSchema }), ctrl.getMedicines);
medicineRouter.post('/', validate({ body: createMedicineSchema }), ctrl.postMedicine);
