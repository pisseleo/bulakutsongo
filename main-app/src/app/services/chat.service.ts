import apiClient from './apiClient';
import type {
  ApiResponse,
  Conversation,
  Message,
  CreateConversationPayload,
  UploadResult,
} from '../types';

// ─── Conversations — conversation.routes.ts ───────────────────────────────────

// POST /conversations
export const createConversation = async (payload: CreateConversationPayload) => {
  const { data } = await apiClient.post<ApiResponse<Conversation>>('/conversations', payload);
  return data.data!;
};

// GET /conversations
export const getConversations = async () => {
  const { data } = await apiClient.get<ApiResponse<Conversation[]>>('/conversations');
  return data.data!;
};

// GET /conversations/:id
export const getConversation = async (id: string) => {
  const { data } = await apiClient.get<ApiResponse<Conversation>>(`/conversations/${id}`);
  return data.data!;
};

// POST /conversations/:id/members
export const addMember = async (conversationId: string, userId: string) => {
  const { data } = await apiClient.post<ApiResponse<Conversation>>(
    `/conversations/${conversationId}/members`,
    { userId }
  );
  return data.data!;
};

// DELETE /conversations/:id/members/:memberId
export const removeMember = async (conversationId: string, memberId: string) => {
  const { data } = await apiClient.delete<ApiResponse<Conversation>>(
    `/conversations/${conversationId}/members/${memberId}`
  );
  return data.data!;
};

// ─── Messages — message.routes.ts ────────────────────────────────────────────

// POST /messages  (multipart if file)
export const sendMessage = async (payload: {
  conversationId: string;
  content: string;
  file?: File;
}) => {
  const form = new FormData();
  form.append('conversationId', payload.conversationId);
  form.append('content', payload.content);
  if (payload.file) form.append('file', payload.file);

  const { data } = await apiClient.post<ApiResponse<Message>>('/messages', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data!;
};

// GET /messages/conversation/:conversationId
export const getMessages = async (conversationId: string, params?: { before?: string; limit?: number }) => {
  const { data } = await apiClient.get<ApiResponse<Message[]>>(
    `/messages/conversation/${conversationId}`,
    { params }
  );
  return data.data!;
};

// POST /messages/:id/read
export const markAsRead = async (messageId: string) => {
  const { data } = await apiClient.post<ApiResponse<null>>(`/messages/${messageId}/read`);
  return data;
};

// DELETE /messages/:id
export const deleteMessage = async (messageId: string) => {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/messages/${messageId}`);
  return data;
};

// ─── Uploads — upload.routes.ts ───────────────────────────────────────────────

// POST /uploads
export const uploadFile = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<ApiResponse<UploadResult>>('/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data!;
};