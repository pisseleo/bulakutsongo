/**
 * configs/multer.ts
 *
 * Local-disk multer storage — replaces Firebase Storage.
 * Files are saved to  <project-root>/uploads/messages/<uuid>.<ext>
 * and served statically via Express at /uploads/...
 *
 * In app.ts add:
 *   import path from 'path';
 *   app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';

// Ensure the upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads/messages');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const ALLOWED_MIMETYPES = [
  // images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  // video
  'video/mp4', 'video/webm',
  // audio
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav',
  // docs
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});