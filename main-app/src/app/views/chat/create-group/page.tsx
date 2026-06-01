'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './create-group.module.css';
import { useAuth } from '@/context/Auth.context';
import { getOnlineUsers } from '@/services/users.service';
import { createGroupConversation } from '@/services/chat.service';
import type { ApiResponse } from '@/types';

type User = {
  id: string;
  full_name: string;
  email: string;
  status?: string;
};

export default function CreateGroup() {
  const router = useRouter();
  const { user: authUser, isAuthenticated, isLoading } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // ── Auth guard ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/views/auth/login');
  }, [isLoading, isAuthenticated, router]);

  // ── Fetch online users ────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const onlineUsers = await getOnlineUsers();
        // Filter: only show users with 'online' status, exclude the logged-in user
        const filteredUsers = onlineUsers.filter(
          (u) => u.status === 'online' && u.id !== authUser?.id
        );
        setUsers(filteredUsers);
      } catch (e) {
        console.error('Failed to fetch online users', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, authUser?.id]);

  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleClearAll = () => {
    setSelectedUsers([]);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Digite o nome do grupo');
      return;
    }

    if (selectedUsers.length === 0) {
      alert('Selecione pelo menos um membro');
      return;
    }

    setCreating(true);
    try {
      await createGroupConversation(groupName, selectedUsers);
      alert('Grupo criado com sucesso!');
      router.push('/views/chat/chat');
    } catch (e) {
      console.error('Failed to create group', e);
      alert('Erro ao criar o grupo. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return <div className={styles.container}><div className={styles.box}>Carregando...</div></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.logo}>👥</div>
        <h1 className={styles.title}>Criar Grupo</h1>
        <p className={styles.subtitle}>Crie um novo grupo de conversa</p>

        <div className={styles.inputGroup}>
          <label>Nome do grupo</label>
          <input 
            type="text" 
            placeholder="Ex: Amigos, Trabalho, Família..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={creating}
          />
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.selectionHeader}>
            <label>Selecionar membros ({selectedUsers.length} de {users.length})</label>
            <div className={styles.selectionButtons}>
              <button 
                type="button" 
                className={styles.selectAllBtn} 
                onClick={handleSelectAll}
                disabled={creating}
              >
                {selectedUsers.length === users.length ? 'Desselecionar Todos' : 'Selecionar Todos'}
              </button>
              {selectedUsers.length > 0 && (
                <button 
                  type="button" 
                  className={styles.clearBtn} 
                  onClick={handleClearAll}
                  disabled={creating}
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
          <div className={styles.membersSection}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                Carregando usuários online...
              </div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                Nenhum usuário online disponível
              </div>
            ) : (
              users.map(user => (
                <div 
                  key={user.id} 
                  className={styles.memberItem}
                  onClick={() => !creating && handleToggleUser(user.id)}
                >
                  <div className={styles.memberAvatar}>{user.full_name?.[0] ?? '👤'}</div>
                  <div className={styles.memberInfo}>
                    <div className={styles.memberName}>{user.full_name}</div>
                    <div className={styles.memberEmail}>{user.email}</div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => {}}
                    className={styles.checkbox}
                    disabled={creating}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <button 
          className={styles.button} 
          onClick={handleCreateGroup}
          disabled={creating}
        >
          {creating ? 'Criando...' : 'Criar Grupo'}
        </button>

        <a href="/views/chat/chat" className={styles.backLink}>
          ← Voltar ao chat
        </a>
      </div>
    </div>
  );
}