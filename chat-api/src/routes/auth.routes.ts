// routes/auth.routes.ts
import { Request, Response, Router } from 'express';
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
import { getCurrentUser } from '../controllers/User.controller';
import { firestoreDb } from '../configs/firebase';

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
router.get('/me', getCurrentUser);
// Protected routes (require authentication)
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);

// TOTP 2FA management
router.get('/totp/setup', authenticate, getTotpSetup);
router.post('/totp/confirm', authenticate, confirmTotp);
router.delete('/totp', authenticate, removeTotp);
router.post('/totp/backup', verifyBackupCode); // uses userId in body, 
// can be public or protected depending on flow
router.get('/test-firestore', async (_req: Request, res: Response) => {
  try {
    await firestoreDb.collection('_test').doc('health').set({ ok: true, time: new Date() });
    res.json({ success: true, message: 'Firestore write successful' });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: err.code });
  }
});
export default router;