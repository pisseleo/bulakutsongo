import { User } from '@/generated/prisma';
import { Request } from 'express';


// ── Augmented Express types ────────────────────────────────────────────────────
export interface AuthenticatedRequest extends Request {
  user: Pick<User, 'id' | 'email' | 'full_name' | 'status'>;
  token: string;
}

// ── Token payloads ─────────────────────────────────────────────────────────────
export interface AccessTokenPayload {
  sub: string;
  email: string;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat?: number;
  exp?: number;
}

// ── API response envelope ──────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: unknown[];
  meta?: Record<string, unknown>;
}

// ── Socket events ──────────────────────────────────────────────────────────────
export interface SocketUserData {
  userId: string;
  email: string;
}

export interface TypingPayload {
  conversationId: string;
}

export interface ReadReceiptPayload {
  messageId: string;
  conversationId: string;
}

export interface NewMessagePayload {
  conversationId: string;
  message: MessageDto;
}

// ── DTO types ──────────────────────────────────────────────────────────────────
export interface MessageDto {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: Date;
  sender: {
    id: string;
    full_name: string;
    profile_picture_url: string | null;
  };
}

export interface PaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export type OtpPurpose = 'ACCOUNT_VERIFICATION' | 'LOGIN' | 'PASSWORD_RESET';