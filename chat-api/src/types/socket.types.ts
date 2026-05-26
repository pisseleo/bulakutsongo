import { Socket } from 'socket.io';
import { Message } from './message.types';

// Eventos do servidor para o cliente
export interface ServerToClientEvents {
  new_message: (message: Message) => void;
  message_read: (data: { messageId: string; userId: string }) => void;
  user_online: (data: { userId: string; socketId: string }) => void;
  user_offline: (userId: string) => void;
  user_typing: (data: { userId: string; conversationId: string; isTyping: boolean }) => void;
}

// Eventos do cliente para o servidor
export interface ClientToServerEvents {
  join_room: (conversationId: string) => void;
  leave_room: (conversationId: string) => void;
  send_message: (data: {
    conversationId: string;
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
    tempId?: string;
  }) => void;
  mark_read: (data: { messageId: string; conversationId: string }) => void;
  typing: (data: { conversationId: string; isTyping: boolean }) => void;
}

// Socket com userId adicionado pelo middleware
export interface SocketWithUserId extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userId?: string;
}