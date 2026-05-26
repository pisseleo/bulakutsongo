// routes/user.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import prisma from '../configs/prisma';
// import { AppError } from '../middleware/error.middleware';

const router = Router();
router.use(authenticate);

// Get current user profile
router.get('/me', async (req, res) => {
  const user = (req as any).user;
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, full_name: true, profile_picture_url: true, is_verified: true, is_2fa_enabled: true },
  });
  res.json({ success: true, data: profile });
});

// Update profile (partial)
router.patch('/me', async (req, res) => {
  const { user } = req as any;
  const { full_name, profile_picture_url } = req.body;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { full_name, profile_picture_url },
    select: { id: true, email: true, full_name: true, profile_picture_url: true },
  });
  res.json({ success: true, data: updated });
});

export default router;