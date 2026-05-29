'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/Auth.context';
import {
  Home, Users, MessageSquare, Settings, LogOut, BarChart3
} from 'lucide-react';
import clsx from 'clsx';

interface NavigationProps {
  currentPage?: 'chat' | 'dashboard' | 'users' | 'profile' | 'groups';
  className?: string;
}

export default function Navigation({ currentPage, className }: NavigationProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/views/auth/login');
  };

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', href: '/views/dashboard' },
    { id: 'chat', icon: MessageSquare, label: 'Conversas', href: '/views/chat' },
    { id: 'groups', icon: Users, label: 'Grupos', href: '/views/chat/chat-group' },
    { id: 'users', icon: BarChart3, label: 'Usuários', href: '/views/users' },
    { id: 'profile', icon: Settings, label: 'Perfil', href: '/views/auth/profile' },
  ];

  return (
    <nav className={clsx(
      'flex items-center gap-1 bg-zinc-950 border-b border-zinc-900 px-4 py-3 overflow-x-auto',
      className
    )}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium',
              isActive
                ? 'bg-amber-500 text-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            )}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}

      <div className="flex-1" />

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/20 transition-all text-sm font-medium"
        title="Logout"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </nav>
  );
}
