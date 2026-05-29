'use client';

import { useState, useEffect, useRef } from 'react';
import styles from '@/views/chat/chat/chat.module.css';

type ChatType = {
  id: number;
  name: string;
  avatar: string;
  type: 'public' | 'private' | 'user';
  members?: number[];
  userId?: number;
  online?: boolean;
};

type MessageType = {
  id: number;
  text: string;
  sender: string;
  time: string;
  file?: string;
  fileName?: string;
  isAudio?: boolean;
};

type UserType = {
  id: number;
  name: string;
  avatar: string;
  email: string;
  online: boolean;
};

export default function Chat() {
  const [userName, setUserName] = useState('');
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Record<number, MessageType[]>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [groups, setGroups] = useState<ChatType[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [activeTab, setActiveTab] = useState<'groups' | 'users'>('groups');
  const [sidebarOpen, setSidebarOpen] = useState(false); // ← new state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentUser: UserType = { id: 1, name: 'João Silva', avatar: '😎', email: 'joao@email.com', online: true };

  // Toggle sidebar
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  // Auto‑close sidebar on window resize (if becomes desktop)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load data from localStorage
  useEffect(() => {
    const name = localStorage.getItem('userName') || localStorage.getItem('tempUserName') || 'Usuário';
    setUserName(name);
    
    const savedGroups = localStorage.getItem('groups');
    if (savedGroups) {
      setGroups(JSON.parse(savedGroups));
    } else {
      const defaultGroups: ChatType[] = [
        { id: 1, name: 'Chat Geral', avatar: '🌍', type: 'public', members: [1,2,3,4,5] },
        { id: 2, name: 'Trabalho', avatar: '💼', type: 'private', members: [1,2,3] },
        { id: 3, name: 'Família', avatar: '👨‍👩‍👧', type: 'private', members: [1,4] },
      ];
      setGroups(defaultGroups);
      localStorage.setItem('groups', JSON.stringify(defaultGroups));
    }

    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      const defaultUsers: UserType[] = [
        { id: 2, name: 'Maria Silva', avatar: '👩', email: 'maria@email.com', online: true },
        { id: 3, name: 'João Carlos', avatar: '👨', email: 'joaoc@email.com', online: false },
        { id: 4, name: 'Ana Santos', avatar: '👧', email: 'ana@email.com', online: true },
        { id: 5, name: 'Pedro Costa', avatar: '👦', email: 'pedro@email.com', online: false },
        { id: 6, name: 'Carla Mendes', avatar: '👩‍🦱', email: 'carla@email.com', online: true },
      ];
      setUsers(defaultUsers);
      localStorage.setItem('users', JSON.stringify(defaultUsers));
    }

    const interval = setInterval(() => {
      setUsers(prevUsers => 
        prevUsers.map(user => ({
          ...user,
          online: Math.random() > 0.5
        }))
      );
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = (text?: string, file?: File, isAudio?: boolean, audioBlob?: Blob) => {
    if (!selectedChat) return;

    let messageText = text || message;
    let fileUrl = '';
    let fileName = '';

    if (file) {
      fileUrl = URL.createObjectURL(file);
      fileName = file.name;
      messageText = `📎 ${file.name}`;
    }

    if (isAudio && audioBlob) {
      fileUrl = URL.createObjectURL(audioBlob);
      messageText = `🎤 Mensagem de voz`;
    }

    if (!messageText.trim() && !file && !isAudio) return;

    const newMsg: MessageType = {
      id: Date.now(),
      text: messageText,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      file: fileUrl,
      fileName: fileName,
      isAudio: isAudio
    };

    const currentMsgs = messages[selectedChat.id] || [];
    
    setMessages({
      ...messages,
      [selectedChat.id]: [...currentMsgs, newMsg]
    });
    setMessage('');
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
    } catch (error) {
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
    localStorage.removeItem('userName');
    localStorage.removeItem('tempUserName');
    window.location.href = '/login';
  };

  const getVisibleGroups = () => {
    return groups.filter(group => {
      if (group.type === 'public') return true;
      return group.members?.includes(currentUser.id);
    });
  };

  const startUserChat = (user: UserType) => {
    const chatId = 1000 + user.id;
    const userChat: ChatType = {
      id: chatId,
      name: user.name,
      avatar: user.avatar,
      type: 'user',
      userId: user.id,
      online: user.online
    };
    setSelectedChat(userChat);
    // Close sidebar on mobile after selecting a chat
    if (window.innerWidth <= 768) closeSidebar();
  };

  const selectGroup = (chat: ChatType) => {
    setSelectedChat(chat);
    if (window.innerWidth <= 768) closeSidebar();
  };

  const onlineUsers = users.filter(user => user.online);
  const offlineUsers = users.filter(user => !user.online);

  return (
    <div className={styles.container}>
      {/* Hamburger menu button - visible only on mobile */}
      <button className={styles.menuToggle} onClick={toggleSidebar}>
        ☰
      </button>

      {/* Overlay - click to close sidebar on mobile */}
      <div 
        className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.sidebarOverlayOpen : ''}`}
        onClick={closeSidebar}
      />

      {/* Main Sidebar */}
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.header}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{currentUser.avatar}</div>
            <span>{userName}</span>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.groupBtn} onClick={() => window.location.href = '/create-group'}>
              ➕
            </button>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              🚪
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
            getVisibleGroups().map((chat) => (
              <div 
                key={chat.id} 
                className={styles.conversationItem} 
                onClick={() => selectGroup(chat)}
              >
                <div className={styles.conversationAvatar}>{chat.avatar}</div>
                <div className={styles.conversationInfo}>
                  <div className={styles.conversationName}>
                    {chat.name}
                    <span className={`${styles.groupBadge} ${chat.type === 'public' ? styles.publicBadge : styles.privateBadge}`}>
                      {chat.type === 'public' ? 'Público' : 'Privado'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              {onlineUsers.length > 0 && (
                <div className={styles.sectionHeader}>
                  <span>🟢 Online ({onlineUsers.length})</span>
                </div>
              )}
              {onlineUsers.map((user) => (
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
              {offlineUsers.length > 0 && (
                <div className={styles.sectionHeader}>
                  <span>⚫ Offline ({offlineUsers.length})</span>
                </div>
              )}
              {offlineUsers.map((user) => (
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
                {selectedChat.type === 'user' && (
                  <small>
                    {selectedChat.online ? '🟢 Online' : '⚫ Offline'}
                  </small>
                )}
                {selectedChat.type === 'public' && (
                  <small>Grupo Público - Todos podem entrar</small>
                )}
                {selectedChat.type === 'private' && (
                  <small>Grupo Privado</small>
                )}
              </div>
            </div>

            <div className={styles.messagesArea}>
              {(messages[selectedChat.id] || []).map((msg: MessageType) => (
                <div 
                  key={msg.id} 
                  className={`${styles.message} ${msg.sender === 'me' ? styles.messageSent : styles.messageReceived}`}
                >
                  {msg.file && msg.isAudio ? (
                    <audio controls src={msg.file} className={styles.audioPlayer} />
                  ) : msg.file ? (
                    <div>
                      {msg.text}
                      {msg.fileName?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                        <img src={msg.file} alt="imagem" className={styles.previewImage} />
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
              <p style={{ fontSize: '12px', marginTop: '10px' }}>
                👥 Grupos públicos - Todos podem entrar<br />
                🔒 Grupos privados - Apenas convidados<br />
                👤 Utilizadores online - Conversas individuais
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}