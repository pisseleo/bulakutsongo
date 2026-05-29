'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOutIcon, PlusCircle, User } from 'lucide-react';
import styles from './chat.module.css';
import { useAuth } from '@/context/Auth.context';
import { 
    createDirectConversation,
  getConversations, 
  getMessages, 
  sendMessage 
} from '@/services/chat.service';
import { getOnlineUsers } from '@/services/users.service';
import OnlineUsers from '@/components/OnlineUsers';
import Navigation from '@/components/Navigation';
import type { Conversation, Message } from '@/types';

type ChatType = {
  id: string;
  name: string;
  avatar: string;
  type: 'group' | 'direct';
  members?: string[];
  userId?: string;
  online?: boolean;
};

type MessageType = {
  id: string;
  text: string;
  senderId: string;
  time: string;
  file?: string;
  fileName?: string;
  isAudio?: boolean;
};

export default function Chat() {
  const router = useRouter();
  const { user: authUser, isAuthenticated, isLoading } = useAuth();
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'groups' | 'users'>('groups');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/views/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch conversations
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchConversations = async () => {
      try {
        const data = await getConversations();
        setConversations(data);
      } catch (error) {
        console.error('Failed to fetch conversations', error);
      }
    };
    fetchConversations();
  }, [isAuthenticated]);

  // Fetch online users
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchOnline = async () => {
      try {
        const users = await getOnlineUsers();
        setOnlineUsers(users);
      } catch (error) {
        console.error('Failed to fetch online users', error);
      }
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Fetch messages when selected chat changes
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      try {
        const msgs = await getMessages(selectedChat.id);
        const formatted = msgs.map((msg: any) => ({
          id: msg.id,
          text: msg.content,
          senderId: msg.sender_id,
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          file: msg.file_url,
          fileName: msg.file_name,
          isAudio: msg.file_type?.startsWith('audio'),
        }));
        setMessages(formatted);
      } catch (error) {
        console.error('Failed to fetch messages', error);
      }
    };
    fetchMessages();
  }, [selectedChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

const handleSendMessage = async (text?: string, file?: File, isAudio?: boolean, audioBlob?: Blob) => {
  if (!selectedChat) return;

  let content = text || message;
  let uploadedFile = file;

  if (isAudio && audioBlob) {
    uploadedFile = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });
    content = '🎤 Mensagem de voz';
  }

  if (!content.trim() && !uploadedFile) return;

  try {
    const newMsg = await sendMessage({
      conversationId: selectedChat.id,
      content,
      file: uploadedFile,
    });

    // Optimistically add to UI – convert null to undefined
    setMessages(prev => [...prev, {
      id: newMsg.id,
      text: newMsg.content,
      senderId: newMsg.senderId,          // adjust if backend returns senderId or sender_id
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      file: newMsg.media_url ?? undefined,  // null → undefined
      // fileName: newMsg.file_name ?? undefined,
      isAudio: newMsg.media_type?.startsWith('audio'),
    }]);
    setMessage('');
  } catch (error) {
    console.error('Failed to send message', error);
  }
};

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedChat) {
      handleSendMessage('', file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (selectedChat) {
          handleSendMessage('', undefined, true, audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          stopRecording();
        }
      }, 30000);
    } catch {
      alert('Permita o acesso ao microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/views/auth/login';
  };

  const handleViewProfile = () => {
    router.push('/views/auth/profile');
  };

 const startUserChat = async (user: any) => {
  try {
    // Check if direct conversation already exists (via existing conversations list)
    const existing = conversations.find(c => c.type === 'direct' && c.members?.some(m => m.id === user.id));
    if (existing) {
      setSelectedChat({
        id: existing.id,
        name: user.name,
        avatar: user.avatar,
        type: 'direct',
        userId: user.id,
        online: user.online,
      });
    } else {
      const newConv = await createDirectConversation(user.id);
      setConversations(prev => [...prev, newConv]);
      setSelectedChat({
        id: newConv.id,
        name: user.name,
        avatar: user.avatar,
        type: 'direct',
        userId: user.id,
        online: user.online,
      });
    }
  } catch (error) {
    console.error('Failed to create direct chat', error);
  }
};

  const handleSelectOnlineUser = async (userId: string) => {
    const user = onlineUsers.find(u => u.id === userId);
    if (user) startUserChat(user);
  };

  // Format conversations for display
  const groupConversations = conversations.filter(c => c.type === 'group');
  const directConversations = conversations.filter(c => c.type === 'direct');

  const onlineUsersList = onlineUsers.filter(u => u.online);
  const offlineUsersList = onlineUsers.filter(u => !u.online);

  return (
    <div className="flex flex-col h-screen bg-emerald-600 text-white">
      <Navigation currentPage="chat" />
      <div className={`${styles.container} flex h-full bg-emerald-700 text-white`}>
        {/* Main Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.header}>
            <div className={`${styles.userInfo} text-gray-700`}>
              <div className={styles.avatar}>{authUser?.full_name?.[0] || '👤'}</div>
              <span>{authUser?.full_name || authUser?.email}</span>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.profileBtn} onClick={handleViewProfile} title="Ver perfil">
                <User size={18} />
              </button>
              <button className={styles.groupBtn} onClick={() => router.push('/views/chat/create-group')}>
                <PlusCircle size={18} className="text-gray-50"/>
              </button>
              <button className={styles.logoutBtn} onClick={handleLogout}>
              <LogOutIcon size={18} className="text-gray-50"/>
              </button>
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'groups' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              👥 Grupos
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👤 Utilizadores
            </button>
          </div>

          <div className={styles.search}>
            <input type="text" placeholder="Pesquisar..." />
          </div>

          <div className={styles.conversationsList}>
            {activeTab === 'groups' ? (
              groupConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={styles.conversationItem}
                  onClick={() => setSelectedChat({
                    id: conv.id,
                    name: conv.name || 'Grupo',
                    avatar: conv.name || '👥',
                    type: 'group',
                    members: conv.members?.map(p => p.id),
                  })}
                >
                  <div className={styles.conversationAvatar}>{conv.avatar || '👥'}</div>
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationName}>
                      {conv.name}
                      <span className={`${styles.groupBadge} ${styles.privateBadge}`}>
                        {conv.type ? 'Privado' : 'Público'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <>
                {onlineUsersList.length > 0 && (
                  <div className={styles.sectionHeader}>
                    <span>🟢 Online ({onlineUsersList.length})</span>
                  </div>
                )}
                {onlineUsersList.map((user) => (
                  <div
                    key={user.id}
                    className={styles.conversationItem}
                    onClick={() => startUserChat(user)}
                  >
                    <div className={styles.conversationAvatar}>{user.avatar}</div>
                    <div className={styles.conversationInfo}>
                      <div className={styles.conversationName}>
                        {user.name}
                        <span className={styles.onlineBadge}>🟢 Online</span>
                      </div>
                      <div className={styles.conversationLastMsg}>{user.email}</div>
                    </div>
                  </div>
                ))}
                {offlineUsersList.length > 0 && (
                  <div className={styles.sectionHeader}>
                    <span>⚫ Offline ({offlineUsersList.length})</span>
                  </div>
                )}
                {offlineUsersList.map((user) => (
                  <div
                    key={user.id}
                    className={styles.conversationItem}
                    onClick={() => startUserChat(user)}
                    style={{ opacity: 0.6 }}
                  >
                    <div className={styles.conversationAvatar}>{user.avatar}</div>
                    <div className={styles.conversationInfo}>
                      <div className={styles.conversationName}>
                        {user.name}
                        <span className={styles.offlineBadge}>⚫ Offline</span>
                      </div>
                      <div className={styles.conversationLastMsg}>{user.email}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={styles.chatArea}>
          {selectedChat ? (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.avatar}>{selectedChat.avatar}</div>
                <div>
                  <h3>{selectedChat.name}</h3>
                  {selectedChat.type === 'direct' && (
                    <small>{selectedChat.online ? '🟢 Online' : '⚫ Offline'}</small>
                  )}
                  {selectedChat.type === 'group' && <small>Grupo</small>}
                </div>
              </div>

              <div className={styles.messagesArea}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${msg.senderId === authUser?.id ? styles.messageSent : styles.messageReceived}`}
                  >
                    {msg.file && msg.isAudio ? (
                      <audio controls src={msg.file} className={styles.audioPlayer} />
                    ) : msg.file ? (
                      <div>
                        {msg.text}
                        {msg.fileName?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <Image src={msg.file} alt="imagem" width={200} height={200} className={styles.previewImage} />
                        ) : (
                          <a href={msg.file} download={msg.fileName} className={styles.fileLink}>
                            📄 Baixar {msg.fileName}
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className={styles.messageText}>{msg.text}</div>
                    )}
                    <div className={styles.messageTime}>{msg.time}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.inputArea}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button onClick={() => fileInputRef.current?.click()}>📎</button>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  style={{ color: isRecording ? 'red' : '#075E54' }}
                >
                  {isRecording ? '🔴' : '🎤'}
                </button>
                <input
                  type="text"
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button className={styles.sendBtn} onClick={() => handleSendMessage()}>➤</button>
              </div>
            </>
          ) : (
            <div className={styles.emptyChat}>
              <div>
                <div style={{ fontSize: '60px' }}>💬</div>
                <h3>BulakutSongo</h3>
                <p>Selecione um grupo ou utilizador para começar</p>
              </div>
            </div>
          )}
        </div>

        {/* Online Users Sidebar */}
        {/* <div className="w-64 border-l border-zinc-900 bg-zinc-950">
          <OnlineUsers onSelectUser={handleSelectOnlineUser} />
        </div> */}
      </div>
    </div>
  );
}