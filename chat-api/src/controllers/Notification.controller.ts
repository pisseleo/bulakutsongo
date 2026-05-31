import { Request, Response, NextFunction } from 'express';
import {
  getUnreadNotifications,
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../services/notification.service';
import { logger } from '../configs/logger';

export class NotificationController {
  static async getUnreadNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await getUnreadNotifications(userId, limit, offset);

      res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: { total: result.total, limit, offset, hasMore: offset + limit < result.total },
      });
    } catch (error) {
      logger.error('Error fetching unread notifications:', error);
      next(error);
    }
  }

  static async getAllNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await getAllNotifications(userId, limit, offset);

      res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: { total: result.total, limit, offset, hasMore: offset + limit < result.total },
      });
    } catch (error) {
      logger.error('Error fetching all notifications:', error);
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { notificationId } = req.params;

      const notification = await markNotificationAsRead(notificationId, userId);

      if (!notification) {
        res.status(404).json({ success: false, error: 'Notification not found' });
        return;
      }

      res.status(200).json({ success: true, data: notification });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const count = await markAllNotificationsAsRead(userId);
      res.status(200).json({ success: true, message: `Marked ${count} notifications as read`, count });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      next(error);
    }
  }

  static async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { notificationId } = req.params;

      const deleted = await deleteNotification(notificationId, userId);

      if (!deleted) {
        res.status(404).json({ success: false, error: 'Notification not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      logger.error('Error deleting notification:', error);
      next(error);
    }
  }

  static async deleteAllNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const count = await deleteAllNotifications(userId);
      res.status(200).json({ success: true, message: `Deleted ${count} notifications`, count });
    } catch (error) {
      logger.error('Error deleting all notifications:', error);
      next(error);
    }
  }

  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const result = await getUnreadNotifications(userId, 1);
      res.status(200).json({ success: true, data: { unreadCount: result.total } });
    } catch (error) {
      logger.error('Error fetching notification stats:', error);
      next(error);
    }
  }
}