'use client';

import { useState } from 'react';
import styles from './create-group.module.css';

type User = {
  id: number;
  name: string;
  email: string;
  avatar: string;
};

export default function CreateGroup() {
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('public');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  const users: User[] = [
    { id: 1, name: 'Maria Silva', email: 'maria@email.com', avatar: '👩' },
    { id: 2, name: 'João Carlos', email: 'joao@email.com', avatar: '👨' },
    { id: 3, name: 'Ana Santos', email: 'ana@email.com', avatar: '👧' },
    { id: 4, name: 'Pedro Costa', email: 'pedro@email.com', avatar: '👦' },
    { id: 5, name: 'Carla Mendes', email: 'carla@email.com', avatar: '👩‍🦱' },
    { id: 6, name: 'Ricardo Lopes', email: 'ricardo@email.com', avatar: '🧔' },
  ];

  const handleToggleUser = (userId: number) => {
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

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      alert('Digite o nome do grupo');
      return;
    }

    if (selectedUsers.length === 0) {
      alert('Selecione pelo menos um membro');
      return;
    }

    const selectedUsersData = users.filter(u => selectedUsers.includes(u.id));
    
    alert(`Grupo "${groupName}" criado com sucesso!\nTipo: ${groupType === 'public' ? 'Público' : 'Privado'}\nMembros: ${selectedUsersData.map(u => u.name).join(', ')}`);
    
    setTimeout(() => {
      window.location.href = '/chat';
    }, 2000);
  };

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
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Tipo de grupo</label>
          <select value={groupType} onChange={(e) => setGroupType(e.target.value)}>
            <option value="public">Público - Qualquer um pode entrar</option>
            <option value="private">Privado - Apenas convidados</option>
          </select>
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.selectionHeader}>
            <label>Selecionar membros ({selectedUsers.length} de {users.length})</label>
            <div className={styles.selectionButtons}>
              <button type="button" className={styles.selectAllBtn} onClick={handleSelectAll}>
                {selectedUsers.length === users.length ? 'Desselecionar Todos' : 'Selecionar Todos'}
              </button>
              {selectedUsers.length > 0 && (
                <button type="button" className={styles.clearBtn} onClick={handleClearAll}>
                  Limpar
                </button>
              )}
            </div>
          </div>
          <div className={styles.membersSection}>
            {users.map(user => (
              <div 
                key={user.id} 
                className={styles.memberItem}
                onClick={() => handleToggleUser(user.id)}
              >
                <div className={styles.memberAvatar}>{user.avatar}</div>
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>{user.name}</div>
                  <div className={styles.memberEmail}>{user.email}</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => {}}
                  className={styles.checkbox}
                />
              </div>
            ))}
          </div>
        </div>

        <button className={styles.button} onClick={handleCreateGroup}>
          Criar Grupo
        </button>

        <a href="/chat" className={styles.backLink}>
          ← Voltar ao chat
        </a>
      </div>
    </div>
  );
}