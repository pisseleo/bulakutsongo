import { create } from 'zustand';
import type { Conversation, Message, OnlineUser } from '@/types';

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Record<string, Message[]>;
  onlineUsers: Record<string, OnlineUser>;
  typingUsers: Record<string, string[]>; // conversationId -> names[]
  unreadCounts: Record<string, number>;

  setConversations: (c: Conversation[]) => void;
  setActiveConversation: (c: Conversation | null) => void;
  setMessages: (convId: string, msgs: Message[]) => void;
  prependMessages: (convId: string, msgs: Message[]) => void;
  addMessage: (convId: string, msg: Message) => void;
  removeMessage: (convId: string, msgId: string) => void;
  setOnlineUsers: (users: Record<string, OnlineUser>) => void;
  setTyping: (convId: string, names: string[]) => void;
  incrementUnread: (convId: string) => void;
  clearUnread: (convId: string) => void;
  updateLastMessage: (convId: string, msg: Message) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversation: null,
  messages: {},
  onlineUsers: {},
  typingUsers: {},
  unreadCounts: {},

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (activeConversation) => set({ activeConversation }),
  setMessages: (convId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [convId]: msgs } })),
  prependMessages: (convId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [convId]: [...msgs, ...(s.messages[convId] || [])] } })),
  addMessage: (convId, msg) =>
    set((s) => {
      const existing = s.messages[convId] || [];
      if (existing.find((m) => m.id === msg.id)) return s;
      return { messages: { ...s.messages, [convId]: [...existing, msg] } };
    }),
  removeMessage: (convId, msgId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [convId]: (s.messages[convId] || []).filter((m) => m.id !== msgId),
      },
    })),
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
  setTyping: (convId, names) =>
    set((s) => ({ typingUsers: { ...s.typingUsers, [convId]: names } })),
  incrementUnread: (convId) =>
    set((s) => ({ unreadCounts: { ...s.unreadCounts, [convId]: (s.unreadCounts[convId] || 0) + 1 } })),
  clearUnread: (convId) =>
    set((s) => ({ unreadCounts: { ...s.unreadCounts, [convId]: 0 } })),
  updateLastMessage: (convId, msg) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, lastMessage: msg } : c
      ),
    })),
}));