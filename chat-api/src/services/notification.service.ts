/**
 * services/notification.service.ts
 *
 * In-app + Socket.IO notifications only — no Firebase/FCM.
 * Notifications are persisted to PostgreSQL so users see them when they reconnect.
 */
import prisma from '../configs/prisma';
import { getSocketServer } from '../socket/socket';
import { logger } from '../configs/logger';
import { NotificationType, Prisma } from '@/generated/prisma';
import { getCache, setCache, delCache } from '../configs/redis';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  conversationId?: string;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: Date;
}

// ── Create & deliver (socket) ─────────────────────────────────────────────────

export async function createAndDeliverNotification(
  input: CreateNotificationInput,
): Promise<NotificationResponse> {
  const notification = await prisma.notification.create({
    data: {
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? {}) as Prisma.JsonObject,
    },
  });

  const formatted: NotificationResponse = {
    id: notification.id,
    userId: notification.user_id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data as Record<string, unknown> | null,
    read: notification.read,
    createdAt: notification.created_at,
  };

  // Real-time delivery via Socket.IO — works for online users instantly
  try {
    const io = getSocketServer();
    io.to(`user:${input.userId}`).emit('notification:new', formatted);
    logger.info(`Notification delivered via socket to user ${input.userId}`);
  } catch (err) {
    // Socket server may not be ready on first boot — notification is still in DB
    logger.warn(`Socket delivery failed for notification ${notification.id}:`, err);
  }

  // Bust unread cache
  await delCache(`notifications:unread:${input.userId}`);

  return formatted;
}

// ── New message notification (skips sender) ───────────────────────────────────

export async function notifyNewMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  preview: string,
): Promise<void> {
  const members = await prisma.conversationMember.findMany({
    where: { conversation_id: conversationId, NOT: { user_id: senderId } },
    select: { user_id: true },
  });

  await Promise.allSettled(
    members.map((m) =>
      createAndDeliverNotification({
        userId: m.user_id,
        type: 'NEW_MESSAGE',
        title: senderName,
        body: preview.length > 80 ? `${preview.slice(0, 77)}...` : preview,
        data: { conversationId },
      }),
    ),
  );
}

// ── Presence broadcast ────────────────────────────────────────────────────────

export async function broadcastPresenceChange(
  userId: string,
  status: 'online' | 'offline',
): Promise<void> {
  try {
    const io = getSocketServer();
    io.emit(`user:${status}`, { userId, timestamp: new Date() });
    logger.info(`Presence broadcast: user ${userId} is now ${status}`);
  } catch (err) {
    logger.warn('Presence broadcast failed:', err);
  }
}

// ── Mark notification as read ─────────────────────────────────────────────────

export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
): Promise<NotificationResponse | null> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, user_id: userId },
  });
  if (!notification) return null;

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  await delCache(`notifications:unread:${userId}`);

  try {
    const io = getSocketServer();
    io.to(`user:${userId}`).emit('notification:read', { notificationId });
  } catch (err) {
    logger.warn('Socket update failed for notification read:', err);
  }

  return {
    id: updated.id,
    userId: updated.user_id,
    type: updated.type,
    title: updated.title,
    body: updated.body,
    data: updated.data as Record<string, unknown> | null,
    read: updated.read,
    createdAt: updated.created_at,
  };
}

// ── Mark all as read ──────────────────────────────────────────────────────────

export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { user_id: userId, read: false },
    data: { read: true },
  });

  await delCache(`notifications:unread:${userId}`);

  try {
    const io = getSocketServer();
    io.to(`user:${userId}`).emit('notifications:read-all');
  } catch (err) {
    logger.warn('Socket update failed for notifications read-all:', err);
  }

  return result.count;
}

// ── Delete notification ───────────────────────────────────────────────────────

export async function deleteNotification(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, user_id: userId },
  });
  if (!notification) return false;

  await prisma.notification.delete({ where: { id: notificationId } });
  await delCache(`notifications:unread:${userId}`);

  try {
    const io = getSocketServer();
    io.to(`user:${userId}`).emit('notification:deleted', { notificationId });
  } catch (err) {
    logger.warn('Socket update failed for notification delete:', err);
  }

  return true;
}

// ── Delete all notifications ──────────────────────────────────────────────────

export async function deleteAllNotifications(userId: string): Promise<number> {
  const result = await prisma.notification.deleteMany({ where: { user_id: userId } });
  await delCache(`notifications:unread:${userId}`);

  try {
    const io = getSocketServer();
    io.to(`user:${userId}`).emit('notifications:deleted-all');
  } catch (err) {
    logger.warn('Socket update failed for notifications delete-all:', err);
  }

  return result.count;
}

// ── Read helpers ──────────────────────────────────────────────────────────────

export async function getUnreadNotifications(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<{ notifications: NotificationResponse[]; total: number }> {
  const cached = await getCache<{ notifications: NotificationResponse[]; total: number }>(
    `notifications:unread:${userId}`,
  );
  if (cached) return cached;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { user_id: userId, read: false },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where: { user_id: userId, read: false } }),
  ]);

  const formatted: NotificationResponse[] = notifications.map((n) => ({
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data as Record<string, unknown> | null,
    read: n.read,
    createdAt: n.created_at,
  }));

  const result = { notifications: formatted, total };
  await setCache(`notifications:unread:${userId}`, result, 300); // 5 min
  return result;
}

export async function getAllNotifications(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<{ notifications: NotificationResponse[]; total: number }> {
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where: { user_id: userId } }),
  ]);

  const formatted: NotificationResponse[] = notifications.map((n) => ({
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data as Record<string, unknown> | null,
    read: n.read,
    createdAt: n.created_at,
  }));

  return { notifications: formatted, total };
}