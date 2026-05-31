import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import prisma from '../configs/prisma';
import {
  markOnline,
  markSocketDisconnected,
  refreshHeartbeat,
} from '../services/presence.service';
import {
  broadcastPresenceChange,
  markNotificationAsRead,
} from '../services/notification.service';
import { setTypingIndicator } from '../services/typing.service';
import { AccessTokenPayload, SocketUserData, TypingPayload, ReadReceiptPayload } from '../types';
import { logger } from '../configs/logger';

let io: Server;

export function getSocketServer(): Server {
  if (!io) throw new Error('Socket.IO server not initialised');
  return io;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // ── JWT Authentication Middleware ──────────────────────────────────────────
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization?.split(' ')[1] ?? '');

    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AccessTokenPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, full_name: true, is_verified: true },
      });

      if (!user || !user.is_verified) return next(new Error('User not found or not verified'));

      (socket as AuthSocket).data = { userId: user.id, email: user.email };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection Handler ─────────────────────────────────────────────────────
  io.on('connection', (socket: AuthSocket) => {
    const { userId } = socket.data;

    handleConnection(socket, userId);

    socket.on('disconnect', () => handleDisconnect(socket));
    socket.on('heartbeat', () => handleHeartbeat(userId));
    socket.on('typing:start', (data: TypingPayload) => handleTypingStart(socket, userId, data));
    socket.on('typing:stop', (data: TypingPayload) => handleTypingStop(socket, userId, data));
    socket.on('message:read', (data: ReadReceiptPayload) => handleMessageRead(socket, userId, data));
    
    // Notification handlers
    socket.on('notification:read', (notificationId: string) =>
      handleNotificationRead(userId, notificationId),
    );
  });

  logger.info('Socket.IO server initialised');
  return io;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleConnection(socket: AuthSocket, userId: string): Promise<void> {
  try {
    await markOnline(userId, socket.id);

    // Personal room (targeted notifications & DMs)
    socket.join(`user:${userId}`);

    // Join all conversation rooms
    const memberships = await prisma.conversationMember.findMany({
      where: { user_id: userId },
      select: { conversation_id: true },
    });
    for (const m of memberships) {
      socket.join(`conv:${m.conversation_id}`);
    }

    // Notify all peers that this user is online
    await broadcastPresenceChange(userId, 'online');

    logger.info(`Socket connected: user=${userId} socket=${socket.id}`);
  } catch (err) {
    logger.error(`Connection setup error for user ${userId}:`, err);
  }
}

async function handleDisconnect(socket: AuthSocket): Promise<void> {
  try {
    const result = await markSocketDisconnected(socket.id);
    const { userId, wentOffline } = result;

    if (userId && wentOffline) {
      await broadcastPresenceChange(userId, 'offline');
      logger.info(`User fully offline: userId=${userId}`);
    }
  } catch (err) {
    logger.error('Disconnect handler error:', err);
  }
}

async function handleHeartbeat(userId: string): Promise<void> {
  await refreshHeartbeat(userId);
}

async function handleTypingStart(
  socket: AuthSocket,
  userId: string,
  data: TypingPayload,
): Promise<void> {
  if (!data?.conversationId) return;

  socket.to(`conv:${data.conversationId}`).emit('typing:start', {
    userId,
    conversationId: data.conversationId,
  });

  // Store in Redis
  await setTypingIndicator(data.conversationId, userId, true);

  // Auto-clear after 5 seconds
  setTimeout(() => {
    socket.to(`conv:${data.conversationId}`).emit('typing:stop', {
      userId,
      conversationId: data.conversationId,
    });
    setTypingIndicator(data.conversationId, userId, false).catch(() => null);
  }, 5_000);
}

async function handleTypingStop(
  socket: AuthSocket,
  userId: string,
  data: TypingPayload,
): Promise<void> {
  if (!data?.conversationId) return;

  socket.to(`conv:${data.conversationId}`).emit('typing:stop', {
    userId,
    conversationId: data.conversationId,
  });
  await setTypingIndicator(data.conversationId, userId, false);
}

function handleMessageRead(
  socket: AuthSocket,
  userId: string,
  data: ReadReceiptPayload,
): void {
  if (!data?.messageId || !data?.conversationId) return;

  socket.to(`conv:${data.conversationId}`).emit('message:read', {
    messageId: data.messageId,
    readBy: userId,
    readAt: new Date(),
  });
}

async function handleNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  try {
    await markNotificationAsRead(notificationId, userId);
    logger.debug(`Notification marked as read: ${notificationId}`);
  } catch (err) {
    logger.warn(`Error marking notification as read:`, err);
  }
}

// ── Socket type augmentation ──────────────────────────────────────────────────
type AuthSocket = Socket & { data: SocketUserData };
