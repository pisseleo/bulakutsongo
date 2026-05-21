import { Router } from 'express';
import * as authController from '../controllers/Auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { registerSchema, loginSchema, twoFASchema, resetPasswordRequestSchema, resetPasswordSchema } from '../common/validation';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/2fa/verify', validate(twoFASchema), authController.verify2FA);
router.post('/2fa/setup', requireAuth, authController.setup2FA);
router.post('/2fa/enable', requireAuth, validate(twoFASchema), authController.enable2FA);
router.post('/password/reset-request', validate(resetPasswordRequestSchema), authController.requestPasswordReset);
router.post('/password/reset', validate(resetPasswordSchema), authController.resetPassword);

export default router;