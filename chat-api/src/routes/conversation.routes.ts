// routes/conversation.routes.ts
import { Router } from 'express';
import {
  createConversation,
  getConversations,
  getConversation,
  addMember,
  removeMember,
} from '../controllers/Conversation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate); // all conversation routes require auth

router.post('/', createConversation);
router.get('/', getConversations);
router.get('/:id', getConversation);
router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);

export default router;