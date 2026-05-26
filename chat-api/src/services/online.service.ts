import { redisClient } from '../configs/redis';

export const setUserOnline = async (userId: string, socketId: string) => {
  await redisClient.hset('online_users', userId, socketId);
};

export const setUserOffline = async (userId: string) => {
  await redisClient.hdel('online_users', userId);
};

export const isUserOnline = async (userId: string): Promise<boolean> => {
  const socketId = await redisClient.hget('online_users', userId);
  return !!socketId;
};

export const getUserSocketId = async (userId: string): Promise<string | null> => {
  return await redisClient.hget('online_users', userId);
};

// Notificação de online para amigos/membros de conversas (usar Socket.IO)
// export const notifyOnlineToConversations = async (userId: string, socketId: string, io: any) => {
//   // Buscar conversas do user e emitir para cada sala
//   // Implementar conforme necessário
// };