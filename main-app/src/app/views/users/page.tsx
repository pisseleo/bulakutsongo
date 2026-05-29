'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Users, Search, Shield, CheckCircle, AlertCircle, ArrowLeft,
  Mail, Clock, MessageSquare
} from 'lucide-react';
import { getOnlineUsers, getCurrentUser } from '@/services/chat.service';
import { useAuth } from '@/context/Auth.context';
import apiClient from '@/services/apiClient';
import clsx from 'clsx';

interface AllUser {
  id: string;
  email: string;
  full_name: string;
  profile_picture_url: string | null;
  status: 'ONLINE' | 'OFFLINE';
  last_seen: Date;
  is_verified: boolean;
  is_2fa_enabled: boolean;
  created_at?: Date;
}

export default function UsersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AllUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'last_seen' | 'joined'>('name');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/views/auth/login');
      return;
    }

    fetchAllUsers();
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    filterAndSortUsers();
  }, [search, filter, sortBy, allUsers]);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      // Fetch online users from the endpoint
      const users = await getOnlineUsers();
      setAllUsers(users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let result = [...allUsers];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filter === 'online') {
      result = result.filter(u => u.status === 'ONLINE');
    } else if (filter === 'offline') {
      result = result.filter(u => u.status === 'OFFLINE');
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.full_name.localeCompare(b.full_name);
        case 'last_seen':
          return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
        case 'joined':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        default:
          return 0;
      }
    });

    setFilteredUsers(result);
  };

  const onlineCount = allUsers.filter(u => u.status === 'ONLINE').length;
  const verifiedCount = allUsers.filter(u => u.is_verified).length;

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/views/dashboard')}
            className="p-2 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Users size={20} className="text-amber-400" />
              Todos os Usuários
            </h1>
            <p className="text-xs text-zinc-500 mt-1">Gerencie e visualize todos os usuários da plataforma</p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b border-zinc-900 bg-zinc-950/50 px-6 py-3 flex gap-8">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Total:</span>
          <span className="font-bold text-lg text-white">{allUsers.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-zinc-400">Online:</span>
          <span className="font-bold text-green-400">{onlineCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-blue-400" />
          <span className="text-sm text-zinc-400">Verificados:</span>
          <span className="font-bold text-blue-400">{verifiedCount}</span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="border-b border-zinc-900 bg-zinc-950/30 px-6 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <Search size={18} className="text-zinc-500" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div className="flex gap-2">
            {(['all', 'online', 'offline'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  filter === f
                    ? 'bg-amber-500 text-black'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                )}
              >
                {f === 'all' && 'Todos'}
                {f === 'online' && 'Online'}
                {f === 'offline' && 'Offline'}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="name">Ordenar por Nome</option>
              <option value="last_seen">Ordenar por Atividade</option>
              <option value="joined">Ordenar por Data</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Users size={48} strokeWidth={1} className="mb-4" />
            <p className="text-sm font-medium">Nenhum usuário encontrado</p>
            <p className="text-xs mt-1">Tente ajustar seus filtros</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {filteredUsers.map((user, idx) => (
              <UserItemRow key={user.id} user={user} index={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── User Item Row ────────────────────────────────────────────────────────────

function UserItemRow({ user, index }: { user: AllUser; index: number }) {
  const isOnline = user.status === 'ONLINE';

  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-zinc-950/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          {user.profile_picture_url ? (
            <Image
              src={user.profile_picture_url}
              alt={user.full_name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-blue-500/20 flex items-center justify-center text-sm font-bold text-amber-400">
              {user.full_name[0]?.toUpperCase()}
            </div>
          )}

          {/* Online indicator */}
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
          )}
        </div>

        {/* User Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-white">{user.full_name}</p>
            {user.is_verified && (
              <CheckCircle size={14} className="text-blue-400" title="Verificado" />
            )}
            {user.is_2fa_enabled && (
              <Shield size={14} className="text-green-400" title="2FA Ativo" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Mail size={12} />
              {user.email}
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock size={12} />
              {formatLastSeen(user.last_seen)}
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <div className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
          isOnline
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-zinc-900 text-zinc-500'
        )}>
          <div className={clsx(
            'w-2 h-2 rounded-full',
            isOnline ? 'bg-green-500' : 'bg-zinc-600'
          )} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>
    </div>
  );
}

// ─── Helper Function ──────────────────────────────────────────────────────────

function formatLastSeen(date: Date | string): string {
  const now = new Date();
  const seen = new Date(date);
  const diffMs = now.getTime() - seen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}m atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;

  return seen.toLocaleDateString('pt-PT');
}
