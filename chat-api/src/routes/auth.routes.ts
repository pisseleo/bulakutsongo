// routes/auth.routes.ts
import { Router } from 'express';
import {
  register,
  verifyAccount,
  resendOtp,
  login,
  loginWith2FA,
  refreshTokens,
  logout,
  logoutAll,
  getTotpSetup,
  confirmTotp,
  removeTotp,
  verifyBackupCode,
  forgotPassword,
  resetPassword,
} from '../controllers/Auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/verify-account', verifyAccount);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/login/2fa', loginWith2FA);
router.post('/refresh', refreshTokens);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (require authentication)
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);

// TOTP 2FA management
router.get('/totp/setup', authenticate, getTotpSetup);
router.post('/totp/confirm', authenticate, confirmTotp);
router.delete('/totp', authenticate, removeTotp);
router.post('/totp/backup', verifyBackupCode); // uses userId in body, can be public or protected depending on flow

export default router;