import { Server as HttpServer } from 'http';
import { Server} from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisClient } from './redis';           // ← importação corrigida
import jwt from 'jsonwebtoken';
import { ClientToServerEvents, ServerToClientEvents, SocketWithUserId } from '../types/socket.types';

export function initializeSocket(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
  });

 io.adapter(createAdapter(redisClient, redisClient.duplicate())); // ← usado redis

  io.use((socket: SocketWithUserId, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));
    jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
      if (err) return next(new Error('Invalid token'));
      socket.userId = decoded.userId;
      next();
    });
  });

  io.on('connection', (socket: SocketWithUserId) => {
    const userId = socket.userId!;
    redisClient.hset('online_users', userId, socket.id);       // ← usado redis
    socket.broadcast.emit('user_online', { userId, socketId: socket.id });

    socket.on('join_room', (conversationId: any) => socket.join(conversationId));
    socket.on('leave_room', (conversationId: any) => socket.leave(conversationId));

    socket.on('disconnect', () => {
      redisClient.hdel('online_users', userId);                // ← usado redis
      socket.broadcast.emit('user_offline', userId);
    });
  });

  return io;
}