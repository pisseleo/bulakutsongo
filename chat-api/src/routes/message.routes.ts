// routes/message.routes.ts
import { Router } from 'express';
import {
  sendMessage,
  getMessages,
  markAsRead,
  deleteMessage,
} from '../controllers/Message.controller';
import { authenticate } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), sendMessage);
router.get('/conversation/:conversationId', getMessages);
router.post('/:id/read', markAsRead);
router.delete('/:id', deleteMessage);

export default router;