// routes/upload.routes.ts
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { uploadToStorage } from '../configs/firebase';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) throw new Error('No file uploaded');
  const ext = req.file.originalname.split('.').pop();
  const path = `uploads/${(req as any).user.id}/${uuid()}.${ext}`;
  const uploaded = await uploadToStorage(req.file.buffer, path, req.file.mimetype);
  res.json({ success: true, data: { url: uploaded.url, path } });
});

export default router;