import { getCache, setCache, delCache } from '../configs/redis';
import { logger } from '../configs/logger';

const TYPING_TTL_SECONDS = 10; // Typing indicator expires after 10 seconds

// ── Redis key helpers ─────────────────────────────────────────────────────────
const typingKey = (conversationId: string, userId: string) =>
  `typing:${conversationId}:${userId}`;
const conversationTypingKey = (conversationId: string) => `typing:${conversationId}:users`;

/**
 * Set typing indicator for a user in a conversation
 */
export async function setTypingIndicator(
  conversationId: string,
  userId: string,
  isTyping: boolean,
): Promise<void> {
  const key = typingKey(conversationId, userId);
  const convKey = conversationTypingKey(conversationId);

  if (isTyping) {
    // Set the individual user typing indicator
    await setCache(key, userId, TYPING_TTL_SECONDS);

    // Add to set of users typing in this conversation
    const typingUsers = (await getCache<string[]>(convKey)) || [];
    if (!typingUsers.includes(userId)) {
      typingUsers.push(userId);
      await setCache(convKey, typingUsers, TYPING_TTL_SECONDS);
    }

    logger.debug(`Typing started: user=${userId} conv=${conversationId}`);
  } else {
    // Remove the individual indicator
    await delCache(key);

    // Remove from set
    const typingUsers = ((await getCache<string[]>(convKey)) || []).filter(
      (id) => id !== userId,
    );

    if (typingUsers.length > 0) {
      await setCache(convKey, typingUsers, TYPING_TTL_SECONDS);
    } else {
      await delCache(convKey);
    }

    logger.debug(`Typing stopped: user=${userId} conv=${conversationId}`);
  }
}

/**
 * Get all users currently typing in a conversation
 */
export async function getTypingUsers(conversationId: string): Promise<string[]> {
  return (await getCache<string[]>(conversationTypingKey(conversationId))) || [];
}

/**
 * Clear all typing indicators for a conversation
 */
export async function clearConversationTyping(conversationId: string): Promise<void> {
  const convKey = conversationTypingKey(conversationId);
  const typingUsers = (await getCache<string[]>(convKey)) || [];

  // Clear all individual indicators
  await Promise.all(typingUsers.map((userId) => delCache(typingKey(conversationId, userId))));

  // Clear the set
  await delCache(convKey);

  logger.debug(`Cleared typing indicators for conversation=${conversationId}`);
}

/**
 * Remove a user's typing indicator when they disconnect
 */
export async function clearUserTyping(userId: string): Promise<void> {
  // This is best-effort - we'd need to track which conversations a user was typing in
  // For now, let Redis TTL handle cleanup (10 seconds max)
  logger.debug(`User disconnected, typing will auto-expire: user=${userId}`);
}
