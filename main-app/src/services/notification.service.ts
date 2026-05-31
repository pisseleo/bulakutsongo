/**
 * Notification Service (Frontend)
 * 
 * Handles all notification operations:
 * - Fetching notifications from the API
 * - Listening to real-time updates via Socket.IO
 * - Marking notifications as read
 * - Deleting notifications
 */

import { apiClient } from './apiClient';
import type { Socket } from 'socket.io-client';

export interface Notification {
  id: string;
  userId: string;
  type: 'NEW_MESSAGE' | 'MENTION' | 'GROUP_CREATED' | 'GROUP_INVITE' | 'MEMBER_JOINED';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface NotificationStats {
  success: boolean;
  data: {
    unreadCount: number;
  };
}

class NotificationService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Initialize Socket.IO listeners for real-time notifications
   */
  public initializeSocket(socket: Socket): void {
    this.socket = socket;

    // Listen for new notifications
    socket.on('notification:new', (notification: Notification) => {
      this.emit('notification:new', notification);
    });

    // Listen for notification read updates
    socket.on('notification:read', (data: { notificationId: string }) => {
      this.emit('notification:read', data);
    });

    // Listen for notification deleted
    socket.on('notification:deleted', (data: { notificationId: string }) => {
      this.emit('notification:deleted', data);
    });

    // Listen for all notifications marked as read
    socket.on('notifications:read-all', () => {
      this.emit('notifications:read-all');
    });

    // Listen for all notifications deleted
    socket.on('notifications:deleted-all', () => {
      this.emit('notifications:deleted-all');
    });
  }

  /**
   * Get all notifications for the current user
   */
  public async getAll(limit: number = 50, offset: number = 0): Promise<Notification[]> {
    try {
      const response = await apiClient.get<NotificationResponse>(
        `/notifications?limit=${limit}&offset=${offset}`,
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Get only unread notifications for the current user
   */
  public async getUnread(limit: number = 50, offset: number = 0): Promise<Notification[]> {
    try {
      const response = await apiClient.get<NotificationResponse>(
        `/notifications/unread?limit=${limit}&offset=${offset}`,
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics (e.g., unread count)
   */
  public async getStats(): Promise<number> {
    try {
      const response = await apiClient.get<NotificationStats>('/notifications/stats');
      return response.data.data.unreadCount;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  }

  /**
   * Mark a single notification as read
   */
  public async markAsRead(notificationId: string): Promise<Notification> {
    try {
      const response = await apiClient.put<{ success: boolean; data: Notification }>(
        `/notifications/${notificationId}/read`,
      );
      return response.data.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  public async markAllAsRead(): Promise<number> {
    try {
      const response = await apiClient.put<{ success: boolean; count: number }>(
        '/notifications/read-all',
      );
      return response.data.count;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a single notification
   */
  public async delete(notificationId: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/notifications/${notificationId}`);
      return response.data.success;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all notifications
   */
  public async deleteAll(): Promise<number> {
    try {
      const response = await apiClient.delete<{ success: boolean; count: number }>(
        '/notifications',
      );
      return response.data.count;
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }

  /**
   * Emit real-time notification read via Socket.IO
   * (This is handled by API, but we can also emit for immediate UI update)
   */
  public emitRead(notificationId: string): void {
    if (this.socket) {
      this.socket.emit('notification:read', notificationId);
    }
  }

  /**
   * Subscribe to notification events
   */
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Unsubscribe from notification events
   */
  public off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit notification event to all listeners
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }
}

export const notificationService = new NotificationService();
