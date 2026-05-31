import { Request, Response } from 'express';
// import path from 'path';
import prisma from '../configs/prisma';
import { getCache, setCache, delCache } from '../configs/redis';
import { getSocketServer } from '../socket/socket';
import { notifyNewMessage } from '../services/notification.service';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest, PaginationMeta } from '../types';
import { MediaType } from '@/generated/prisma';

// ── Send a message ────────────────────────────────────────────────────────────
export async function sendMessage(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { conversationId, content, mediaType } = req.body as {
    conversationId: string;
    content?: string;
    mediaType?: MediaType;
  };

  // Verify membership
  const membership = await prisma.conversationMember.findUnique({
    where: {
      conversation_id_user_id: { conversation_id: conversationId, user_id: user.id },
    },
  });
  if (!membership) throw new AppError('You are not a member of this conversation', 403);

  // Handle file upload via multer (stored locally in /uploads)
  let mediaUrl: string | null = null;
  let resolvedMediaType: MediaType | null = mediaType ?? null;

  if (req.file) {
    // req.file.path is set by multer diskStorage (e.g. "uploads/messages/<uuid>.ext")
    // Serve the file statically from Express — configure `app.use('/uploads', express.static('uploads'))` in app.ts
    mediaUrl = `/uploads/${req.file.filename}`;

    // Auto-detect media type from mimetype if not provided by client
    if (!resolvedMediaType) {
      const mime = req.file.mimetype;
      if (mime.startsWith('image/'))       resolvedMediaType = 'IMAGE' as MediaType;
      else if (mime.startsWith('video/'))  resolvedMediaType = 'VIDEO' as MediaType;
      else if (mime.startsWith('audio/'))  resolvedMediaType = 'AUDIO' as MediaType;
      else                                 resolvedMediaType = 'FILE'  as MediaType;
    }
  }

  if (!content && !mediaUrl) {
    throw new AppError('Message must have content or a media attachment', 400);
  }

  // Save to PostgreSQL (source of truth)
  const message = await prisma.message.create({
    data: {
      conversation_id: conversationId,
      sender_id: user.id,
      content: content ?? null,
      media_url: mediaUrl,
      media_type: resolvedMediaType,
    },
    include: {
      sender: { select: { id: true, full_name: true, profile_picture_url: true } },
    },
  });

  // Emit via Socket.IO to conversation room — all members receive the message instantly
  const io = getSocketServer();
  io.to(`conv:${conversationId}`).emit('message:new', message);

  // In-app notifications for members who are offline (no FCM — socket-only)
  await notifyNewMessage(
    conversationId,
    user.id,
    message.sender.full_name,
    content ?? '📎 Sent an attachment',
  );

  // Bust the message-list cache for this conversation
  await delCache(`messages:${conversationId}:*`);

  res.status(201).json({ success: true, data: message });
}

// ── Get paginated messages (cursor-based) ─────────────────────────────────────
export async function getMessages(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { conversationId } = req.params;
  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 30, 100);

  // Verify membership
  const membership = await prisma.conversationMember.findUnique({
    where: {
      conversation_id_user_id: { conversation_id: conversationId, user_id: user.id },
    },
  });
  if (!membership) throw new AppError('Access denied', 403);

  const cacheKey = `messages:${conversationId}:${cursor ?? 'start'}:${limit}`;
  const cached = await getCache<unknown>(cacheKey);
  if (cached) {
    res.json({ success: true, ...cached });
    return;
  }

  const rows = await prisma.message.findMany({
    where: { conversation_id: conversationId, is_deleted: false },
    orderBy: { created_at: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      sender: { select: { id: true, full_name: true, profile_picture_url: true } },
    },
  });

  const hasMore = rows.length > limit;
  const messages = hasMore ? rows.slice(0, limit) : rows;
  const meta: PaginationMeta = {
    nextCursor: hasMore ? messages[messages.length - 1].id : null,
    hasMore,
    limit,
  };

  const payload = { data: messages, meta };
  await setCache(cacheKey, payload, 30); // 30 s cache

  res.json({ success: true, ...payload });
}

// ── Mark as read (triggers read receipt via Socket.IO) ─────────────────────────
export async function markAsRead(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { id: messageId } = req.params;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { conversation_id: true, sender_id: true },
  });
  if (!message) throw new AppError('Message not found', 404);

  const io = getSocketServer();
  io.to(`conv:${message.conversation_id}`).emit('message:read', {
    messageId,
    readBy: user.id,
    readAt: new Date(),
  });

  res.status(204).send();
}

// ── Delete a message ──────────────────────────────────────────────────────────
export async function deleteMessage(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { id: messageId } = req.params;

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new AppError('Message not found', 404);
  if (message.sender_id !== user.id) throw new AppError('You can only delete your own messages', 403);

  await prisma.message.update({ where: { id: messageId }, data: { is_deleted: true } });

  const io = getSocketServer();
  io.to(`conv:${message.conversation_id}`).emit('message:deleted', {
    messageId,
    conversationId: message.conversation_id,
    deletedBy: user.id,
  });

  res.status(204).send();
}