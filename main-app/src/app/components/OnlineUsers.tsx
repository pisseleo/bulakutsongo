'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Users } from 'lucide-react';
import { getOnlineUsers } from '@/services/chat.service';
import clsx from 'clsx';

interface OnlineUser {
  id: string;
  email: string;
  full_name: string;
  profile_picture_url: string | null;
  status: string;
  last_seen: Date;
}

interface OnlineUsersProps {
  onSelectUser?: (userId: string) => void;
}

export default function OnlineUsers({ onSelectUser }: OnlineUsersProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOnlineUsers();

    // Refresh online users every 10 seconds
    const interval = setInterval(fetchOnlineUsers, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchOnlineUsers = async () => {
    try {
      setLoading(true);
      const users = await getOnlineUsers();
      setOnlineUsers(users || []);
      setError(null);
    } catch (err) {
      setError('Failed to load online users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-900 flex-shrink-0">
        <Users size={18} className="text-amber-400" />
        <h3 className="text-sm font-semibold">Online ({onlineUsers.length})</h3>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading && !onlineUsers.length && (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="px-3 py-2 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg">
            {error}
          </div>
        )}

        {onlineUsers.length === 0 && !loading && !error && (
          <div className="text-center py-6 text-zinc-600">
            <p className="text-xs">Nenhum usuário online</p>
          </div>
        )}

        {onlineUsers.map((user) => (
          <button
            key={user.id}
            onClick={() => onSelectUser?.(user.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-zinc-900 transition-colors group"
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {user.profile_picture_url ? (
                <Image
                  src={user.profile_picture_url}
                  alt={user.full_name}
                  width={36}
                  height={36}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400">
                  {user.full_name[0]?.toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-950" />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-100 truncate group-hover:text-amber-400 transition-colors">
                {user.full_name}
              </p>
              <p className="text-[10px] text-zinc-600 truncate">{user.email}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
