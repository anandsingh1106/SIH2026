import { Router } from 'express';
import { postSupabaseLogin, getMe, postLogout } from '../controllers/authController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../config/rateLimits.js';
import { supabaseLoginSchema } from '../validators/authValidators.js';

const router = Router();

router.post('/session', authLimiter, validate({ body: supabaseLoginSchema }), postSupabaseLogin);
router.get('/me', requireAuth, getMe);
router.post('/logout', optionalAuth, postLogout);

export default router;
