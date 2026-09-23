import { Router } from 'express';
import {
  getAppointments,
  getAppointmentById,
  postAppointment,
  patchCancel,
  patchReschedule,
  getBookableDoctors,
} from '../controllers/appointmentController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listAppointmentsSchema,
  createAppointmentSchema,
  rescheduleSchema,
  idParamSchema,
  bookableDoctorsSchema,
} from '../validators/appointmentValidators.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listAppointmentsSchema }), getAppointments);
router.post('/', validate({ body: createAppointmentSchema }), postAppointment);
// Declared before '/:id' so 'doctors' is not read as an appointment id.
router.get('/doctors', validate({ query: bookableDoctorsSchema }), getBookableDoctors);
router.get('/:id', validate({ params: idParamSchema }), getAppointmentById);
router.patch('/:id/cancel', validate({ params: idParamSchema }), patchCancel);
router.patch(
  '/:id/reschedule',
  validate({ params: idParamSchema, body: rescheduleSchema }),
  patchReschedule
);

export default router;
