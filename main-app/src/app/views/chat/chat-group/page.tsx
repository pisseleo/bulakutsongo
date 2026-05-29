'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Users, UserPlus, UserMinus, Crown, Settings, X, Search,
  Check, ArrowLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/Auth.context';
import { createConversation, addMember, removeMember, getConversations } from '@/services/chat.service';
import type { Conversation, ConversationMember } from '@/types';
import { Input, Button, FormField } from '@components/ui/Input';
import apiClient from '@/services/apiClient';
import type { User } from '@/types';
import clsx from 'clsx';
import ChatRoom from '@/views/chat/chat-room/page';

export default function ChatGroupPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [loading, setLoading] = useState(true);

  const groups = conversations.filter(c => c.type === 'group');

  useEffect(() => {
    getConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    const convo = await createConversation({ type: 'group', memberIds, name });
    setConversations(prev => [convo, ...prev]);
    setActiveConvo(convo);
    setShowCreate(false);
  };

  const handleMemberUpdate = (updated: Conversation) => {
    setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
    setActiveConvo(updated);
  };

  if (activeConvo && !showManage) {
    return (
      <div className="flex h-full">
        <ChatRoom
          conversation={activeConvo}
          onBack={() => setActiveConvo(null)}
        />
        <div className="w-px bg-zinc-900" />
        <button
          onClick={() => setShowManage(true)}
          className="flex-shrink-0 flex flex-col items-center justify-center w-10 bg-zinc-950 hover:bg-zinc-900 transition-colors border-l border-zinc-900"
          title="Informações do grupo">
          <Users size={16} className="text-zinc-500" />
        </button>
      </div>
    );
  }

  if (activeConvo && showManage) {
    return (
      <GroupManagePanel
        conversation={activeConvo}
        currentUserId={user!.id}
        onBack={() => setShowManage(false)}
        onUpdate={handleMemberUpdate}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-amber-500" />
          <h1 className="font-bold text-sm">Grupos</h1>
        </div>
        <Button onClick={() => setShowCreate(true)} variant="ghost" className="text-xs py-1.5 px-3 gap-1.5">
          <UserPlus size={14} />
          Novo Grupo
        </Button>
      </div>

      {/* Group list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        )}
        {!loading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-600 py-20">
            <Users size={40} strokeWidth={1} />
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-400">Nenhum grupo ainda</p>
              <p className="text-xs mt-1">Crie um para começar a colaborar</p>
            </div>
            <Button onClick={() => setShowCreate(true)} variant="ghost" className="text-xs">
              <UserPlus size={14} /> Criar seu primeiro grupo
            </Button>
          </div>
        )}
        {groups.map(g => (
          <GroupListItem key={g.id} group={g} onClick={() => setActiveConvo(g)} />
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateGroupModal onClose={() => setShowCreate(false)} onCreate={handleCreateGroup} />
      )}
    </div>
  );
}

// ─── Group List Item ──────────────────────────────────────────────────────────

function GroupListItem({ group, onClick }: { group: Conversation; onClick: () => void }) {
  const initials = group.isGroup ? group.name?.[0]?.toUpperCase() || 'G' : group.members.find(m => m.userId !== group.members[0].userId)?.user.full_name[0]?.toUpperCase() || 'U';
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-950 transition-colors text-left border-b border-zinc-900/50">
      <div className="relative flex-shrink-0">
        {group.isGroup && (
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            {initials}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold truncate">{group.name}</p>
          {group.lastMessage && (
            <span className="text-[10px] text-zinc-600 flex-shrink-0 ml-2">
              {new Date(group.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate mt-0.5">
          {group.lastMessage
            ? `${group.lastMessage.sender?.full_name}: ${group.lastMessage.content}`
            : `${group.members.length} membros`}
        </p>
      </div>
      {group.lastMessage?.isRead && (
        <span className="flex-shrink-0 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-amber-500 text-black text-[10px] font-bold px-1.5">
          {group.unreadCount}
        </span>
      )}
    </button>
  );
}

// ─── Create Group Modal ───────────────────────────────────────────────────────

function CreateGroupModal({
  onClose, onCreate
}: { onClose: () => void; onCreate: (name: string, memberIds: string[]) => Promise<void> }) {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!search.trim()) { setUsers([]); return; }
      setLoading(true);
      try {
        const { data } = await apiClient.get<{ data: User[] }>('/users/search', { params: { q: search } });
        setUsers(data.data);
      } catch {} finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const toggle = (u: User) => {
    setSelected(prev => prev.some(s => s.id === u.id)
      ? prev.filter(s => s.id !== u.id)
      : [...prev, u]);
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      await onCreate(name, selected.map(s => s.id));
    } catch {} finally { setCreating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
          <h2 className="font-bold text-sm">Novo Grupo</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <FormField label="Nome do Grupo">
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Equipa de Design" icon={<Users size={15} />} />
          </FormField>

          <FormField label={`Adicionar Membros${selected.length ? ` (${selected.length})` : ''}`}>
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar utilizadores..." icon={<Search size={15} />} />
          </FormField>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(u => (
                <div key={u.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs text-amber-400">
                  {u.full_name}
                  <button onClick={() => toggle(u)} className="text-amber-500 hover:text-amber-300">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search results */}
          <div className="max-h-48 overflow-y-auto -mx-5 px-5 flex flex-col gap-1">
            {loading && <p className="text-xs text-zinc-600 text-center py-3">A pesquisar...</p>}
            {users.map(u => {
              const isSel = selected.some(s => s.id === u.id);
              return (
                <button key={u.id} onClick={() => toggle(u)}
                  className={clsx('flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors w-full',
                    isSel ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-zinc-900 border border-transparent')}>
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">
                    {u.profile_picture_url
                      ? <Image src={u.profile_picture_url} alt="" width={32} height={32} className="rounded-lg" />
                      : u.full_name[0].toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{u.full_name}</p>
                    <p className="text-xs text-zinc-500">@{u.email}</p>
                  </div>
                  {isSel && <Check size={14} className="text-amber-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <Button onClick={onClose} variant="ghost" fullWidth>Cancelar</Button>
          <Button onClick={handleCreate} isLoading={creating} fullWidth
            disabled={!name.trim() || selected.length === 0}>
            Criar Grupo
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Group Manage Panel ───────────────────────────────────────────────────────

function GroupManagePanel({ conversation, currentUserId, onBack, onUpdate }: {
  conversation: Conversation;
  currentUserId: string;
  onBack: () => void;
  onUpdate: (c: Conversation) => void;
}) {
  const isAdmin = conversation.members.find(m => m.userId === currentUserId)?.role === 'admin';
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!search.trim()) { setUsers([]); return; }
      try {
        const { data } = await apiClient.get<{ data: User[] }>('/users/search', { params: { q: search } });
        setUsers(data.data.filter(u => !conversation.members.some(m => m.userId === u.id)));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [search, conversation.members]);

  const handleAdd = async (userId: string) => {
    setAddLoading(true);
    try {
      const updated = await addMember(conversation.id, userId);
      onUpdate(updated);
      setSearch('');
      setUsers([]);
    } catch {} finally { setAddLoading(false); }
  };

  const handleRemove = async (memberId: string) => {
    setLoading(memberId);
    try {
      const updated = await removeMember(conversation.id, memberId);
      onUpdate(updated);
    } catch {} finally { setLoading(null); }
  };

  return (
    <div className="flex flex-col h-full bg-black w-80 border-l border-zinc-900">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-900">
        <button onClick={onBack} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-bold text-sm">Informações do Grupo</h2>
      </div>

      {/* Group header */}
      <div className="flex flex-col items-center gap-3 py-6 border-b border-zinc-900">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl font-bold">
          {conversation.name?.[0]?.toUpperCase()}
        </div>
        <div className="text-center">
          <h3 className="font-bold">{conversation.name}</h3>
          <p className="text-xs text-zinc-500">{conversation.members.length} membros</p>
        </div>
      </div>

      {/* Add member (admin only) */}
      {isAdmin && (
        <div className="px-4 py-3 border-b border-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-2">Adicionar Membros</p>
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar para adicionar..." icon={<Search size={14} />} />
          {users.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 max-h-32 overflow-y-auto">
              {users.map(u => (
                <button key={u.id} onClick={() => handleAdd(u.id)} disabled={addLoading}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-900 text-left transition-colors">
                  <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 flex-shrink-0">
                    {u.full_name[0]}
                  </div>
                  <span className="text-xs flex-1 truncate">{u.full_name}</span>
                  <UserPlus size={12} className="text-amber-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3">Membros</p>
        <div className="flex flex-col gap-1">
          {conversation.members.map(member => (
            <div key={member.userId}
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-zinc-950 group">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">
                {member.user.profile_picture_url
                  ? <Image src={member.user.profile_picture_url} alt="" width={32} height={32} className="rounded-xl" />
                  : member.user.full_name[0].toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium truncate">{member.user.full_name}</p>
                  {member.role === 'admin' && (
                    <Crown size={10} className="text-amber-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-600">@{member.user.email}</p>
              </div>
              {isAdmin && member.userId !== currentUserId && (
                <button onClick={() => handleRemove(member.userId)} disabled={loading === member.userId}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  {loading === member.userId
                    ? <div className="w-3 h-3 border border-zinc-600 border-t-transparent rounded-full animate-spin" />
                    : <UserMinus size={13} />
                  }
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}