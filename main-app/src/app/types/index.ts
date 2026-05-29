export interface User {
  id: string;
  email: string;
  full_name: string;
  profile_picture_url?: string;
  is_verified: boolean;
  is_2fa_enabled: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
 
export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requires2FA: boolean;
  pendingUserId?: string; // used during 2FA login flow
}
 
// ─── Auth API Payloads ────────────────────────────────────────────────────────
 
export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  displayName: string;
}
 
export interface LoginPayload {
  email: string;
  password: string;
}
 
export interface Login2FAPayload {
  userId: string;
  totpCode?: string;
  backupCode?: string;
}
 
export interface VerifyAccountPayload {
  email: string;
  otp: string;
}
 
export interface ResendOtpPayload {
  email: string;
  purpose: string;
}
 
export interface ForgotPasswordPayload {
  email: string;
}
 
export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}
 
export interface ConfirmTotpPayload {
  totpCode: string;
}
 
export interface TotpSetup {
  secret: string;
  qrCode: string; // data URI
  backupCodes: string[];
}


export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio';
  media_url: string | null;
  media_type: 'image' | 'video' | 'document' | 'voice' | null;
  isRead: boolean;
  deletedAt?: string;
  createdAt: string;
  // Firestore realtime mirror
  firestoreId?: string;
}

export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  name?: string;
  isGroup: boolean;
  members: ConversationMember[];
  lastMessage?: Message;
  type: ConversationType;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationPayload {
  type: ConversationType;
  memberIds: string[];
  name?: string; // required for groups
}
 


export interface ConversationMember {
  id: string;
  userId: string;
  user: User;
  conversationId: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface OnlineUser {
  uid: string;
  name: string;
  avatar?: string;
  lastSeen: number;
}

export interface TypingEvent {
  userId: string;
  name: string;
  conversationId: string;
}

// Firestore realtime message doc shape
export interface FirestoreMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: string;
  fileUrl?: string;
  createdAt: number;
  isRead: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
 
// ─── Upload ───────────────────────────────────────────────────────────────────
 
export interface UploadResult {
  url: string;
  path: string;
}
