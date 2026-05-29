// routes/user.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  getCurrentUser, 
  updateProfile, 
  getOnlineUsers, 
  getUserById 
} from '../controllers/User.controller';

const router = Router();

// Public endpoints (no auth required)
// GET /users/online - Get all online users
router.get('/online', getOnlineUsers);

// Protected endpoints (auth required)
router.use(authenticate);

// Get current user profile
router.get('/me', getCurrentUser);

// Update profile (partial)
router.patch('/me', updateProfile);

// Get user profile by ID
router.get('/:id', getUserById);

export default router;