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
    { id: 'chat', icon: MessageSquare, label: 'Conversas', href: '/views/chat/chat' },
    { id: 'groups', icon: Users, label: 'Grupos', href: '/views/chat/chat-group' },
    { id: 'users', icon: BarChart3, label: 'Usuários', href: '/views/users' },
    { id: 'profile', icon: Settings, label: 'Perfil', href: '/views/auth/profile' },
  ];

  return (
    <nav
      className={clsx(
        'sticky top-0 z-10 flex items-center gap-1 px-3 py-2 overflow-x-auto',
        'bg-[#075E54]', // WhatsApp green background
        'border-b border-white/10',
        className
      )}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium',
              isActive
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Icon size={18} />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}

      <div className="flex-1" />

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium text-white/80 hover:text-white hover:bg-red-500/20"
        title="Sair"
      >
        <LogOut size={18} />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </nav>
  );
}