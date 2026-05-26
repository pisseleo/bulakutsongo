import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr);
  return format(date, 'HH:mm');
}

export function formatConversationTime(dateStr?: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd/MM/yy');
}

export function formatRelative(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function avatarColor(id: string) {
  const colors = [
    'bg-violet-500', 'bg-cyan-500', 'bg-emerald-500',
    'bg-rose-500', 'bg-amber-500', 'bg-indigo-500',
    'bg-teal-500', 'bg-pink-500',
  ];
  const idx = (id?.charCodeAt(0) || 0) % colors.length;
  return colors[idx];
}