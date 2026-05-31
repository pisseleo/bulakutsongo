/**
 * Notification Context
 * 
 * Provides notification state management and real-time updates
 * across the application via React Context API
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { notificationService, type Notification } from '../../services/notification.service';
import socket  from '../services/api';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  fetchUnread: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all notifications
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notificationService.getAll();
      setNotifications(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch only unread notifications
   */
  const fetchUnread = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notificationService.getUnread();
      setNotifications(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch unread notifications';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh unread count
   */
  const refreshStats = useCallback(async () => {
    try {
      const count = await notificationService.getStats();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to refresh notification stats:', err);
    }
  }, []);

  /**
   * Mark single notification as read
   */
  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await notificationService.markAsRead(id);
        
        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        
        // Update count
        if (unreadCount > 0) {
          setUnreadCount(unreadCount - 1);
        }
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
        throw err;
      }
    },
    [unreadCount],
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      throw err;
    }
  }, []);

  /**
   * Delete single notification
   */
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.delete(id);
      
      // Update local state
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        const wasUnread = prev.find((n) => n.id === id)?.read === false;
        
        if (wasUnread && unreadCount > 0) {
          setUnreadCount(unreadCount - 1);
        }
        
        return updated;
      });
    } catch (err) {
      console.error('Failed to delete notification:', err);
      throw err;
    }
  }, [unreadCount]);

  /**
   * Delete all notifications
   */
  const deleteAllNotifications = useCallback(async () => {
    try {
      await notificationService.deleteAll();
      
      // Update local state
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to delete all notifications:', err);
      throw err;
    }
  }, []);

  /**
   * Set up socket listeners on mount
   */
  useEffect(() => {
    if (!socket) return;

    notificationService.initializeSocket(socket);

    // Listen for new notifications
    notificationService.on('notification:new', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Listen for notification read updates
    notificationService.on('notification:read', ({ notificationId }: { notificationId: string }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });

    // Listen for notification deleted
    notificationService.on('notification:deleted', ({ notificationId }: { notificationId: string }) => {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    });

    // Listen for all notifications marked as read
    notificationService.on('notifications:read-all', () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    });

    // Listen for all notifications deleted
    notificationService.on('notifications:deleted-all', () => {
      setNotifications([]);
      setUnreadCount(0);
    });

    // Initial load
    fetchUnread().then(refreshStats);

    // Refresh stats every 30 seconds
    const statsInterval = setInterval(refreshStats, 30000);

    return () => {
      clearInterval(statsInterval);
    };
  }, [fetchUnread, refreshStats]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        fetchNotifications,
        fetchUnread,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        refreshStats,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use notification context
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
