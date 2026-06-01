'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogOutIcon, PlusCircle, User, UsersIcon, Wifi, WifiOff } from 'lucide-react';
import styles from './chat.module.css';
import { useAuth } from '@/context/Auth.context';
import { useSocket } from '@/context/Socket.context';
import {
  createDirectConversation,
  getConversations,
  getMessages,
  sendMessage,
} from '@/services/chat.service';
import { getOnlineUsers } from '@/services/users.service';
import Navigation from '@/components/Navigation';
import OnlineUsers, { type OnlineUser } from '@/components/OnlineUsers';
import type { Conversation, ConversationMember, Message } from '@/types';

// ─── Local display types ──────────────────────────────────────────────────────

/** Flat shape used only inside this component for the selected-chat header. */
type ChatType = {
  id: string;
  name: string;
  avatar: string;
  type: 'group' | 'direct';
  memberIds: string[];
  /** userId of the other participant — only for direct chats */
  userId?: string;
  online?: boolean;
};

/** Flat shape for rendering a single message bubble. */
type MessageBubble = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  time: string;
  date: string;
  file?: string;
  isAudio?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Chat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, isAuthenticated, isLoading } = useAuth();
  const { socket, isConnected } = useSocket();

  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [inputText, setInputText] = useState('');
  const [bubbles, setBubbles] = useState<MessageBubble[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'groups' | 'users'>('groups');
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  const [isMobile, setIsMobile] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedChatRef = useRef<ChatType | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ── Detect mobile view ────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  // ── Re-join socket room on reconnect ──────────────────────────────────────
  useEffect(() => {
    if (!socket || !isConnected || !selectedChat) return;
    console.log('[Chat] 🔁 (Re)joining room after connect:', selectedChat.id);
    socket.emit('join_room', selectedChat.id);
  }, [socket, isConnected, selectedChat?.id]);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/views/auth/login');
  }, [isLoading, isAuthenticated, router]);

  // ── Fetch conversations ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try { setConversations(await getConversations()); }
      catch (e) { console.error('Failed to fetch conversations', e); }
    })();
  }, [isAuthenticated]);

  // ── Deep-link: auto-open chat from query params (?userId=&userName=&conversationId=)
  useEffect(() => {
    if (!isAuthenticated || !authUser) return;
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');
    const conversationId = searchParams.get('conversationId');
    if (!userId || !userName) return;

    const openDeepLinkedChat = async () => {
      try {
        let conv: Conversation;
        if (conversationId) {
          // Prefer the conversationId passed directly
          conv = { id: conversationId, isGroup: false, members: [{ userId }] } as any;
        } else {
          conv = await createDirectConversation(userId);
        }
        selectChat({
          id: conv.id,
          name: decodeURIComponent(userName),
          avatar: decodeURIComponent(userName)[0] ?? '👤',
          type: 'direct',
          memberIds: [userId, authUser.id],
          userId,
          online: false,
        });
        // Clean up query params without a full navigation
        router.replace('/views/chat/chat');
      } catch (e) {
        console.error('Failed to open deep-linked chat', e);
      }
    };

    openDeepLinkedChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authUser?.id]);

  // ── Fetch online users (refresh every 60 s) ───────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetch = async () => {
      try { setOnlineUsers(await getOnlineUsers()); }
      catch (e) { console.error('Failed to fetch online users', e); }
    };
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  // ── Fetch messages when conversation changes ──────────────────────────────
  useEffect(() => {
    if (!selectedChat) return;
    setBubbles([]);
    (async () => {
      try {
        const msgs: Message[] = await getMessages(selectedChat.id);
        // API returns newest-first (cursor desc) — reverse for display
        setBubbles(msgs.slice().reverse().map(msgToBubble));
      } catch (e) { console.error('Failed to fetch messages', e); }
    })();
  }, [selectedChat?.id]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bubbles]);

  // ── Socket.IO listeners ───────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onMessageNew = (msg: any) => {
      console.log('[Chat] 📨 Message new event:', { 
        msgId: msg.id, 
        conversationId: msg.conversation_id || msg.conversationId,
        currentChatId: selectedChatRef.current?.id,
        senderId: msg.sender_id || msg.senderId
      });
      
      // Only append if the message belongs to the currently open conversation
      if (msg.conversationId !== selectedChatRef.current?.id &&
          msg.conversation_id !== selectedChatRef.current?.id) {
        console.log('[Chat] ⚠️ Message ignored: different conversation');
        return;
      }

      setBubbles((prev) => {
        // Replace optimistic bubble (same id) or append
        if (prev.some((b) => b.id === msg.id)) {
          console.log('[Chat] ℹ️ Message already exists (optimistic), skipping');
          return prev;
        }
        console.log('[Chat] ➕ Adding message to bubbles');
        return [...prev, socketMsgToBubble(msg)];
      });

      // Also update lastMessage preview in sidebar
      setConversations((prev) =>
        prev.map((c) =>
          c.id === (msg.conversationId ?? msg.conversation_id)
            ? { ...c, lastMessage: normaliseApiMessage(msg) }
            : c,
        ),
      );
    };

    const onMessageDeleted = ({ messageId }: { messageId: string }) => {
      setBubbles((prev) => prev.filter((b) => b.id !== messageId));
    };

    const onTypingStart = ({ userId, conversationId }: { userId: string; conversationId: string }) => {
      if (selectedChatRef.current?.id !== conversationId) return;
      if (userId === authUser?.id) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: true }));
    };

    const onTypingStop = ({ userId, conversationId }: { userId: string; conversationId: string }) => {
      if (selectedChatRef.current?.id !== conversationId) return;
      setTypingUsers((prev) => { const n = { ...prev }; delete n[userId]; return n; });
    };

    const onUserOnline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: 'online' } : u));
      setSelectedChat((prev) => prev?.userId === userId ? { ...prev, online: true } : prev);
    };

    const onUserOffline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: 'offline' } : u));
      setSelectedChat((prev) => prev?.userId === userId ? { ...prev, online: false } : prev);
    };

    socket.on('message:new',     onMessageNew);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('typing:start',    onTypingStart);
    socket.on('typing:stop',     onTypingStop);
    socket.on('user:online',     onUserOnline);
    socket.on('user:offline',    onUserOffline);

    return () => {
      socket.off('message:new',     onMessageNew);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('typing:start',    onTypingStart);
      socket.off('typing:stop',     onTypingStop);
      socket.off('user:online',     onUserOnline);
      socket.off('user:offline',    onUserOffline);
    };
  }, [socket, isConnected, authUser?.id]);

  // ── Emit typing indicator ─────────────────────────────────────────────────
  const handleTyping = useCallback(() => {
    if (!socket || !selectedChatRef.current) return;
    socket.emit('typing:start', { conversationId: selectedChatRef.current.id });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: selectedChatRef.current?.id });
    }, 4_000);
  }, [socket]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (
    text?: string,
    file?: File,
    isAudio?: boolean,
    audioBlob?: Blob,
  ) => {
    if (!selectedChat || !authUser) return;

    let content = text ?? inputText;
    let uploadFile = file;

    if (isAudio && audioBlob) {
      uploadFile = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });
      content = '🎤 Voice message';
    }

    if (!content.trim() && !uploadFile) return;

    console.log('[Chat] 📤 Sending message:', { 
      conversationId: selectedChat.id, 
      hasContent: !!content.trim(),
      hasFile: !!uploadFile
    });

    // Stop typing
    if (socket) {
      socket.emit('typing:stop', { conversationId: selectedChat.id });
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }

    // Optimistic bubble
    const tempId = `temp-${Date.now()}`;
    const now_date = new Date();
    setBubbles((prev) => [
      ...prev,
      {
        id: tempId,
        text: content,
        senderId: authUser.id,
        senderName: authUser.full_name ?? authUser.email ?? 'You',
        date: now_date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
        time: now_date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        file: uploadFile ? URL.createObjectURL(uploadFile) : undefined,
        isAudio,
      },
    ]);
    setInputText('');

    try {
      const saved: Message = await sendMessage({
        conversationId: selectedChat.id,
        content,
        file: uploadFile,
      });

      // Swap optimistic bubble with confirmed one
      setBubbles((prev) =>
        prev.map((b) => b.id === tempId ? msgToBubble(saved) : b),
      );

      // Update sidebar lastMessage
      setConversations((prev) =>
        prev.map((c) => c.id === selectedChat.id ? { ...c, lastMessage: saved } : c),
      );
    } catch (e) {
      console.error('Failed to send message', e);
      setBubbles((prev) => prev.filter((b) => b.id !== tempId));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSendMessage('', file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleSendMessage('', undefined, true, blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
      setTimeout(() => { if (recorder.state === 'recording') stopRecording(); }, 30_000);
    } catch {
      alert('Please allow microphone access');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ── Select chat + join socket room ────────────────────────────────────────
  const selectChat = (chat: ChatType) => {
    console.log('[Chat] 🔄 Switching chat:', { chatId: chat.id, chatName: chat.name });
    
    if (socket && selectedChat?.id) {
      console.log('[Chat] 📤 Leaving room:', selectedChat.id);
      socket.emit('leave_room', selectedChat.id);
    }
    
    setSelectedChat(chat);
    setTypingUsers({});
    
    if (socket) {
      console.log('[Chat] 📥 Joining room:', chat.id);
      socket.emit('join_room', chat.id);
    } else {
      console.warn('[Chat] ⚠️ Socket not available when selecting chat');
    }
  };

  // ── Open or create a DM with an online user ───────────────────────────────
  const startUserChat = async (u: OnlineUser) => {
    try {
      // Check existing direct conversation in state first
      const existing = conversations.find(
        (c) => !c.isGroup && (c.members ?? []).some((m: ConversationMember) => m.userId === u.id),
      );
      if (existing) {
        selectChat(convToChat(existing, u));
        return;
      }
      const conv: Conversation = await createDirectConversation(u.id);
      setConversations((prev) => [conv, ...prev]);
      selectChat(convToChat(conv, u));
    } catch (e) {
      console.error('Failed to create direct chat', e);
    }
  };

  // ── Derive lists ─────────────────────────────────────────────────────────
  const groupConversations = conversations.filter((c) => c.isGroup);
  // Only show online users who are not the logged-in user
  const onlineList  = onlineUsers.filter((u) => u.status === 'online' && u.id !== authUser?.id);
  const offlineList = onlineUsers.filter((u) => u.status !== 'online' && u.id !== authUser?.id);
  const typingLabel = Object.keys(typingUsers).length > 0 ? 'typing…' : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-emerald-600 text-white">
      <Navigation currentPage="chat" />
      <div className={`${styles.container} flex h-full bg-emerald-700 text-white`}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className={styles.sidebar}>
          <div className={styles.header}>
            <div className={`${styles.userInfo} text-gray-700`}>
              <div className={styles.avatar}>{authUser?.full_name?.[0] ?? '👤'}</div>
              <span>{authUser?.full_name ?? authUser?.email}</span>
            </div>
            <div className={styles.headerActions}>
              <span title={isConnected ? 'Connected' : 'Disconnected'}>
                {isConnected
                  ? <Wifi size={14} className="text-green-400" />
                  : <WifiOff size={14} className="text-red-400" />}
              </span>
              <button className={styles.profileBtn} onClick={() => router.push('/views/auth/profile')}>
                <User size={18} />
              </button>
              <button className={styles.groupBtn} onClick={() => router.push('/views/chat/create-group')}>
                <PlusCircle size={18} className="text-gray-50" />
              </button>
              <button className={styles.logoutBtn} onClick={() => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/views/auth/login';
              }}>
                <LogOutIcon size={18} className="text-gray-50" />
              </button>
            </div>
          </div>

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'groups' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('groups')}><UsersIcon /> Groups</button>
            <button className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('users')}>👤 Users</button>
          </div>

          <div className={styles.search}>
            <input type="text" placeholder="Search…" />
          </div>

          <div className={styles.conversationsList}>
            {/* Mobile: show combined list; Desktop: show tab-based list */}
            {isMobile ? (
              // MOBILE: Combined list with groups and users
              <>
                {groupConversations.length > 0 && (
                  <div className={styles.sectionHeader}>👥 Groups ({groupConversations.length})</div>
                )}
                {groupConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`${styles.conversationItem} ${selectedChat?.id === conv.id ? styles.activeConversation : ''}`}
                  onClick={() => selectChat({
                    id: conv.id,
                    name: conv.name ?? 'Group',
                    avatar: conv.name?.[0] ?? '👥',
                    type: 'group',
                    // ConversationMember has userId (camelCase) per the type definition
                    memberIds: (conv.members ?? []).map((m: ConversationMember) => m.userId),
                  })}
                >
                  <div className={styles.conversationAvatar}>{conv.name?.[0] ?? '👥'}</div>
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationName}>{conv.name ?? 'Group'}</div>
                    {/* lastMessage — not messages[] — per the Conversation type */}
                    {conv.lastMessage && (
                      <div className={styles.conversationLastMsg}>
                        {conv.lastMessage.content || '📎 anexos'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
                {onlineList.length > 0 && (
                  <div className={styles.sectionHeader}>🟢 Online ({onlineList.length})</div>
                )}
                {onlineList.map((u) => (
                  <div key={u.id} className={styles.conversationItem} onClick={() => startUserChat(u)}>
                    <div className={styles.conversationAvatar}>{u.full_name?.[0] ?? '👤'}</div>
                    <div className={styles.conversationInfo}>
                      <div className={styles.conversationName}>
                        {u.full_name} <span className={styles.onlineBadge}>🟢</span>
                      </div>
                      <div className={styles.conversationLastMsg}>{u.email}</div>
                    </div>
                  </div>
                ))}
                {offlineList.length > 0 && (
                  <div className={styles.sectionHeader}>⚫ Offline ({offlineList.length})</div>
                )}
                {offlineList.map((u) => (
                  <div key={u.id} className={styles.conversationItem} style={{ opacity: 0.6 }}
                    onClick={() => startUserChat(u)}>
                    <div className={styles.conversationAvatar}>{u.full_name?.[0] ?? '👤'}</div>
                    <div className={styles.conversationInfo}>
                      <div className={styles.conversationName}>{u.full_name}</div>
                      <div className={styles.conversationLastMsg}>{u.email}</div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              // DESKTOP: Tab-based list
              <>
                {activeTab === 'groups' ? (
                  groupConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`${styles.conversationItem} ${selectedChat?.id === conv.id ? styles.activeConversation : ''}`}
                      onClick={() => selectChat({
                        id: conv.id,
                        name: conv.name ?? 'Group',
                        avatar: conv.name?.[0] ?? '👥',
                        type: 'group',
                        memberIds: (conv.members ?? []).map((m: ConversationMember) => m.userId),
                      })}
                    >
                      <div className={styles.conversationAvatar}>{conv.name?.[0] ?? '👥'}</div>
                      <div className={styles.conversationInfo}>
                        <div className={styles.conversationName}>{conv.name ?? 'Group'}</div>
                        {conv.lastMessage && (
                          <div className={styles.conversationLastMsg}>
                            {conv.lastMessage.content || '📎 anexos'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    {onlineList.length > 0 && (
                      <div className={styles.sectionHeader}>🟢 Online ({onlineList.length})</div>
                    )}
                    {onlineList.map((u) => (
                      <div key={u.id} className={styles.conversationItem} onClick={() => startUserChat(u)}>
                        <div className={styles.conversationAvatar}>{u.full_name?.[0] ?? '👤'}</div>
                        <div className={styles.conversationInfo}>
                          <div className={styles.conversationName}>
                            {u.full_name} <span className={styles.onlineBadge}>🟢</span>
                          </div>
                          <div className={styles.conversationLastMsg}>{u.email}</div>
                        </div>
                      </div>
                    ))}
                    {offlineList.length > 0 && (
                      <div className={styles.sectionHeader}>⚫ Offline ({offlineList.length})</div>
                    )}
                    {offlineList.map((u) => (
                      <div key={u.id} className={styles.conversationItem} style={{ opacity: 0.6 }}
                        onClick={() => startUserChat(u)}>
                        <div className={styles.conversationAvatar}>{u.full_name?.[0] ?? '👤'}</div>
                        <div className={styles.conversationInfo}>
                          <div className={styles.conversationName}>{u.full_name}</div>
                          <div className={styles.conversationLastMsg}>{u.email}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Chat area ─────────────────────────────────────────────────────── */}
        <div className={styles.chatArea}>
          {selectedChat ? (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.avatar}>{selectedChat.avatar}</div>
                <div>
                  <h3>{selectedChat.name}</h3>
                  <small>
                    {typingLabel
                      ? <span className="animate-pulse">{typingLabel}</span>
                      : selectedChat.type === 'direct'
                        ? selectedChat.online ? '🟢 Online' : '⚫ Offline'
                        : 'Group'}
                  </small>
                </div>
              </div>

              <div className={styles.messagesArea}>
                {bubbles.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    No messages yet. Start the conversation!
                  </div>
                )}
                {bubbles.map((b) => {
                  const isSentByMe = b.senderId === authUser?.id;
                  return (
                  <div
                    key={b.id}
                    className={`${styles.message} ${
                      isSentByMe ? styles.messageSent : styles.messageReceived
                    } ${b.id.startsWith('temp-') ? 'opacity-60' : ''}`}
                  >
                    {/* Show sender name only for received messages */}
                    {!isSentByMe && (
                      <div className={styles.senderName}>{b.senderName}</div>
                    )}
                    
                    {b.file && b.isAudio ? (
                      <audio controls src={b.file} className={styles.audioPlayer} />
                    ) : b.file ? (
                      <div>
                        {b.text && <div className={styles.messageText}>{b.text}</div>}
                        {/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(b.file) ? (
                          <Image src={b.file} alt="anexos" width={200} height={200}
                            className={styles.previewImage} />
                        ) : (
                          <a href={b.file} download className={styles.fileLink}>
                            📄 Download file
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className={styles.messageText}>{b.text}</div>
                    )}
                    <div className={styles.messageFooter}>
                      <span className={styles.messageDate}>{b.date}</span>
                      <span className={styles.messageTime}>{b.time}</span>
                    </div>
                  </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.inputArea}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload}
                  style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()}>📎</button>
                <button onClick={isRecording ? stopRecording : startRecording}
                  style={{ color: isRecording ? 'red' : undefined }}>
                  {isRecording ? '🔴' : '🎤'}
                </button>
                <input
                  type="text"
                  placeholder="Type a message…"
                  value={inputText}
                  onChange={(e) => { setInputText(e.target.value); handleTyping(); }}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                />
                <button className={styles.sendBtn} onClick={() => handleSendMessage()}>➤</button>
              </div>
            </>
          ) : (
            <div className={styles.emptyChat}>
              <div>
                <div style={{ fontSize: '60px' }}>💬</div>
                <h3>BulakutSongo</h3>
                <p>Select a group or user to start chatting</p>
                {!isConnected && (
                  <p className="text-red-400 text-sm mt-2">⚠ Connecting to server…</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Online users panel (hidden on mobile) ─────────────────────────── */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <OnlineUsers
            selectedUserId={selectedChat?.userId}
            onSelectUser={(user) => startUserChat(user)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Pure helpers (no hooks) ──────────────────────────────────────────────────

/** Map a typed Message (from REST API) to a display bubble. */
function msgToBubble(msg: any): MessageBubble {
  // API returns snake_case, so handle both formats
  const createdAtStr = msg.createdAt || msg.created_at;
  const senderId = msg.senderId || msg.sender_id;
  const senderName = msg.sender?.full_name || msg.sender_name || msg.sender?.email || 'Unknown';
  
  // Parse date safely - handle ISO string
  let date: Date;
  try {
    date = new Date(createdAtStr);
    if (isNaN(date.getTime())) {
      date = new Date();
    }
  } catch {
    date = new Date();
  }
  
  return {
    id: msg.id,
    text: msg.content ?? '',
    senderId,
    senderName,
    date: date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    file: msg.media_url ?? undefined,
    // Message.media_type uses lowercase: 'voice' | 'image' | 'video' | 'document'
    isAudio: msg.media_type === 'voice' || msg.media_type === 'VOICE',
  };
}

/**
 * Map a raw socket payload (snake_case from the server emit) to a display bubble.
 * The server emits the Prisma row directly so fields are snake_case.
 */
function socketMsgToBubble(msg: any): MessageBubble {
  // Handle both snake_case and camelCase formats
  const createdAtStr = msg.created_at || msg.createdAt;
  const senderId = msg.sender_id || msg.senderId;
  const senderName = msg.sender?.full_name || msg.sender_name || msg.sender?.email || 'Unknown';
  
  // Parse date safely - handle ISO string
  let date: Date;
  try {
    date = new Date(createdAtStr ?? Date.now());
    if (isNaN(date.getTime())) {
      date = new Date();
    }
  } catch {
    date = new Date();
  }
  
  return {
    id: msg.id,
    text: msg.content ?? '',
    senderId,
    senderName,
    date: date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    file: msg.media_url ?? undefined,
    isAudio: msg.media_type === 'AUDIO' || msg.media_type === 'voice',
  };
}

/**
 * Coerce a raw socket payload into the Message shape so we can store it
 * as Conversation.lastMessage (which is typed as Message).
 */
function normaliseApiMessage(raw: any): Message {
  return {
    id: raw.id,
    conversationId: raw.conversation_id ?? raw.conversationId,
    senderId: raw.sender_id ?? raw.senderId,
    content: raw.content ?? '',
    type: 'text',
    media_url: raw.media_url ?? null,
    media_type: raw.media_type ?? null,
    isRead: false,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
  };
}

/**
 * Build a ChatType header object from a Conversation + the other participant's
 * profile (for direct chats) or just the conversation for groups.
 */
function convToChat(conv: Conversation, otherUser?: any): ChatType {
  const name = conv.isGroup
    ? (conv.name ?? 'Group')
    : (otherUser?.full_name ?? otherUser?.name ?? 'User');

  return {
    id: conv.id,
    name,
    avatar: name[0] ?? '👤',
    type: conv.isGroup ? 'group' : 'direct',
    // ConversationMember.userId is camelCase per type definition
    memberIds: (conv.members ?? []).map((m: ConversationMember) => m.userId),
    userId: otherUser?.id,
    online: otherUser?.status === 'online',
  };
}