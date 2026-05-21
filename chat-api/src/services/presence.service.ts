import prisma from '../configs/prisma';
import { setCache, getCache, delCache } from '../configs/redis';
import { setFirestorePresence } from '../configs/firebase';
import { logger } from '../configs/logger';

const ONLINE_TTL_SECONDS = 65;       // refreshed every 30s by heartbeat
const SOCKETS_TTL_SECONDS = 86_400; // 24h

// ── Redis key helpers ─────────────────────────────────────────────────────────
const onlineKey = (userId: string) => `presence:online:${userId}`;
const socketsKey = (userId: string) => `presence:sockets:${userId}`;
const socketUserKey = (socketId: string) => `presence:socket:${socketId}`;

/**
 * Mark a user as online, associate the socket ID.
 * Writes to Redis (authoritative) + Firestore (for client-side listeners).
 */
export async function markOnline(userId: string, socketId: string): Promise<void> {
  await setCache(onlineKey(userId), '1', ONLINE_TTL_SECONDS);
  await setCache(socketUserKey(socketId), userId, SOCKETS_TTL_SECONDS);

  const existing = (await getCache<string[]>(socketsKey(userId))) ?? [];
  if (!existing.includes(socketId)) {
    await setCache(socketsKey(userId), [...existing, socketId], SOCKETS_TTL_SECONDS);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: 'ONLINE', last_seen: new Date() },
  });

  // Parallel write to Firestore for web/mobile client listeners
  setFirestorePresence(userId, 'online').catch((err) =>
    logger.warn(`Firestore presence write failed: ${err.message}`),
  );
}

/**
 * Remove a socket from a user's active connections.
 * Only marks the user offline when their LAST socket disconnects.
 * Returns whether the user went fully offline.
 */
export async function markSocketDisconnected(socketId: string): Promise<{
  userId: string | null;
  wentOffline: boolean;
}> {
  const userId = await getCache<string>(socketUserKey(socketId));
  if (!userId) return { userId: null, wentOffline: false };

  await delCache(socketUserKey(socketId));

  const remaining = ((await getCache<string[]>(socketsKey(userId))) ?? []).filter(
    (id) => id !== socketId,
  );

  if (remaining.length > 0) {
    await setCache(socketsKey(userId), remaining, SOCKETS_TTL_SECONDS);
    return { userId, wentOffline: false };
  }

  // Last socket — user is fully offline
  await delCache(socketsKey(userId), onlineKey(userId));

  await prisma.user.update({
    where: { id: userId },
    data: { status: 'OFFLINE', last_seen: new Date() },
  });

  setFirestorePresence(userId, 'offline').catch((err) =>
    logger.warn(`Firestore presence write failed: ${err.message}`),
  );

  return { userId, wentOffline: true };
}

/**
 * Refresh the online TTL (called by heartbeat event every 30s).
 */
export async function refreshHeartbeat(userId: string): Promise<void> {
  await setCache(onlineKey(userId), '1', ONLINE_TTL_SECONDS);
}

/**
 * Check if a specific user is online.
 */
export async function isOnline(userId: string): Promise<boolean> {
  return !!(await getCache(onlineKey(userId)));
}

/**
 * Bulk check online status for a list of user IDs.
 */
export async function getBulkOnlineStatus(
  userIds: string[],
): Promise<Record<string, boolean>> {
  const results = await Promise.all(userIds.map((id) => isOnline(id)));
  return Object.fromEntries(userIds.map((id, i) => [id, results[i]]));
}

/**
 * Get all socket IDs for a user (multi-device support).
 */
export async function getUserSocketIds(userId: string): Promise<string[]> {
  return (await getCache<string[]>(socketsKey(userId))) ?? [];
}