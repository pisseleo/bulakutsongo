'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Users, MessageSquare, Settings, LogOut, Home, Plus,
  Search, Shield, CheckCircle, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/Auth.context';
import { getOnlineUsers, getCurrentUser } from '@/services/chat.service';
import clsx from 'clsx';

interface OnlineUser {
  id: string;
  email: string;
  full_name: string;
  profile_picture_url: string | null;
  status: string;
  last_seen: Date;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineCount: 0,
    verified: 0
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/views/auth/login');
      return;
    }

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [isLoading, isAuthenticated, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const users = await getOnlineUsers();
      setOnlineUsers(users || []);
      
      // Calculate stats
      setStats({
        totalUsers: users?.length || 0,
        onlineCount: users?.filter(u => u.status === 'ONLINE').length || 0,
        verified: users?.length || 0
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/views/auth/login');
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-bold">
            BS
          </div>
          <div>
            <h1 className="font-bold text-lg">Bulakutsongo</h1>
            <p className="text-xs text-zinc-500">Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/views/auth/profile')}
            className="p-2 rounded-lg hover:bg-zinc-900 transition-colors"
            title="Perfil"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-950/50 transition-colors text-red-400"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/30 rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-2">Bem-vindo, {user?.full_name}!</h2>
            <p className="text-zinc-400">Gerencie conversas, usuários e configurações tudo em um só lugar.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              icon={<Users size={24} />}
              title="Usuários Online"
              value={stats.onlineCount}
              subtitle={`de ${stats.totalUsers} total`}
              color="amber"
            />
            <StatCard
              icon={<CheckCircle size={24} />}
              title="Usuários Verificados"
              value={stats.verified}
              subtitle="Contas confirmadas"
              color="green"
            />
            <StatCard
              icon={<MessageSquare size={24} />}
              title="Conversas Ativas"
              value={stats.onlineCount > 0 ? Math.ceil(stats.onlineCount / 2) : 0}
              subtitle="Sessões abertas"
              color="blue"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuickActionButton
              icon={<MessageSquare size={20} />}
              title="Ir para Chat"
              description="Acesse suas conversas"
              onClick={() => router.push('/views/chat/chat')}
              color="amber"
            />
            <QuickActionButton
              icon={<Users size={20} />}
              title="Criar Grupo"
              description="Comece uma nova conversa de grupo"
              onClick={() => router.push('/views/chat/chat-group')}
              color="blue"
            />
          </div>

          {/* Online Users Section */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <h3 className="font-bold text-lg">Usuários Online</h3>
                <span className="text-xs text-zinc-500 ml-2">({onlineUsers.length})</span>
              </div>
            </div>

            <div className="overflow-y-auto max-h-96">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                </div>
              ) : onlineUsers.length === 0 ? (
                <div className="p-6 text-center text-zinc-600">
                  <p className="text-sm">Nenhum usuário online no momento</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {onlineUsers.slice(0, 10).map((u) => (
                    <UserRowItem key={u.id} user={u} />
                  ))}
                </div>
              )}
            </div>

            {onlineUsers.length > 10 && (
              <div className="px-6 py-3 border-t border-zinc-900 bg-zinc-950/50">
                <button
                  onClick={() => router.push('/views/users')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                >
                  Ver todos os usuários ({onlineUsers.length})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card Component ──────────────────────────────────────────────────────

function StatCard({
  icon,
  title,
  value,
  subtitle,
  color
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  subtitle: string;
  color: 'amber' | 'green' | 'blue';
}) {
  const colors = {
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30'
  };

  const iconColors = {
    amber: 'text-amber-400',
    green: 'text-green-400',
    blue: 'text-blue-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-6`}>
      <div className={`${iconColors[color]} mb-4`}>{icon}</div>
      <h3 className="text-sm font-semibold text-zinc-400 mb-1">{title}</h3>
      <p className="text-3xl font-bold mb-2">{value}</p>
      <p className="text-xs text-zinc-500">{subtitle}</p>
    </div>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────────────────

function QuickActionButton({
  icon,
  title,
  description,
  onClick,
  color
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: 'amber' | 'blue';
}) {
  const colors = {
    amber: 'hover:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
    blue: 'hover:bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40'
  };

  const iconColors = {
    amber: 'text-amber-400',
    blue: 'text-blue-400'
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 p-6 bg-zinc-950 border border-zinc-900 rounded-2xl transition-all ${colors[color]}`}
    >
      <div className={`${iconColors[color]}`}>{icon}</div>
      <div className="text-left">
        <h4 className="font-bold text-white">{title}</h4>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
    </button>
  );
}

// ─── User Row Item ────────────────────────────────────────────────────────────

function UserRowItem({ user }: { user: OnlineUser }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 hover:bg-zinc-900/50 transition-colors">
      <div className="flex items-center gap-3">
        {user.profile_picture_url ? (
          <Image
            src={user.profile_picture_url}
            alt={user.full_name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
            {user.full_name[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-white">{user.full_name}</p>
          <p className="text-xs text-zinc-500">{user.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-xs text-green-400 font-medium">Online</span>
      </div>
    </div>
  );
}
