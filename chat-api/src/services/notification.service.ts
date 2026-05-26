
import prisma from '../configs/prisma';
import { sendMulticastPush, PushPayload } from '../configs/firebase';
import { isOnline } from './presence.service';
import { getSocketServer } from '../socket/socket';
import { logger } from '../configs/logger';
import { NotificationType, Prisma } from '@/generated/prisma';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Create an in-app notification, deliver it via Socket.IO (if online)
 * and via FCM push (if offline or no socket).
 */
export async function createAndDeliverNotification(
  input: CreateNotificationInput,
): Promise<void> {
  // Persist to Postgres
  const notification = await prisma.notification.create({
    data: {
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? {}) as Prisma.JsonObject, 
    },
  });

  // Deliver via Socket.IO (instant, if connected)
  const io = getSocketServer();
  io.to(`user:${input.userId}`).emit('notification:new', notification);

  // FCM push for offline users (or extra reliability for mobile)
  const online = await isOnline(input.userId);
  if (!online) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { fcm_tokens: true },
    });

    if (user?.fcm_tokens.length) {
      const payload: PushPayload = {
        title: input.title,
        body: input.body,
        data: {
          notificationId: notification.id,
          type: input.type,
          ...(input.data
            ? Object.fromEntries(
                Object.entries(input.data).map(([k, v]) => [k, String(v)]),
              )
            : {}),
        },
      };
      await sendMulticastPush(user.fcm_tokens, payload);
    }
  }
}

/**
 * Notify all conversation members about a new message.
 * Skips the sender.
 */
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
    members.map((m: any) =>
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

/**
 * Broadcast a user's online status to all users in their conversations.
 */
export async function broadcastPresenceChange(
  userId: string,
  status: 'online' | 'offline',
): Promise<void> {
  const io = getSocketServer();
  io.emit(`user:${status}`, { userId, timestamp: new Date() });
  logger.info(`Presence broadcast: user ${userId} is now ${status}`);
}

/**
 * Register or update an FCM device token for a user.
 */
export async function registerFcmToken(userId: string, token: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcm_tokens: true },
  });
  if (!user) return;

  if (!user.fcm_tokens.includes(token)) {
    await prisma.user.update({
      where: { id: userId },
      data: { fcm_tokens: { push: token } },
    });
  }
}

/**
 * Remove an FCM token (e.g. on logout from that device).
 */
export async function removeFcmToken(userId: string, token: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcm_tokens: true },
  });
  if (!user) return;

  await prisma.user.update({
    where: { id: userId },
    data: { fcm_tokens: user.fcm_tokens.filter((t: any) => t !== token) },
  });
}