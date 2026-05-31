/**
 * Notification Component
 * 
 * Displays a notification item with actions (mark as read, delete)
 */

'use client';

import React from 'react';
import { useNotifications } from '@/context/Notification.context';
import type { Notification } from '@/services/notification.service';

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotifications();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleMarkAsRead = async () => {
    try {
      await markAsRead(notification.id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteNotification(notification.id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'NEW_MESSAGE':
        return '💬';
      case 'MENTION':
        return '🔔';
      case 'GROUP_CREATED':
        return '👥';
      case 'GROUP_INVITE':
        return '📨';
      case 'MEMBER_JOINED':
        return '✅';
      default:
        return '📌';
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 border rounded-lg transition-colors ${
        notification.read
          ? 'bg-gray-50 border-gray-200'
          : 'bg-blue-50 border-blue-200'
      }`}
    >
      {/* Icon */}
      <div className="text-xl">{getTypeIcon(notification.type)}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{notification.title}</h3>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.body}</p>
        <time className="text-xs text-gray-500 mt-2 block">
          {new Date(notification.createdAt).toLocaleString()}
        </time>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!notification.read && (
          <button
            onClick={handleMarkAsRead}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Mark as read"
          >
            ✓
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
          title="Delete notification"
        >
          ✕
        </button>
      </div>

      {/* Unread Badge */}
      {!notification.read && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}
    </div>
  );
}

interface NotificationListProps {
  notifications: Notification[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function NotificationList({
  notifications,
  isLoading = false,
  emptyMessage = 'No notifications',
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin">⏳</div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
}

interface NotificationBellProps {
  onClick?: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { unreadCount } = useNotifications();

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      title="Notifications"
    >
      <span className="text-xl">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, isLoading, unreadCount, markAllAsRead, deleteAllNotifications } =
    useNotifications();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      {/* Panel */}
      <div className="relative w-96 max-w-full h-screen bg-white shadow-xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Toolbar */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 p-4 border-b bg-gray-50">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Mark all as read
              </button>
            )}
            <button
              onClick={deleteAllNotifications}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Delete all
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            emptyMessage="You're all caught up!"
          />
        </div>
      </div>
    </div>
  );
}
