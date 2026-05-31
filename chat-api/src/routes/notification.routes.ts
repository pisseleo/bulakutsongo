import { Router } from 'express';
import { NotificationController } from '../controllers/Notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Protect all notification routes with authentication
router.use(authenticate);

/**
 * GET /api/notifications
 * Get all notifications (read & unread)
 */
router.get('/', NotificationController.getAllNotifications);

/**
 * GET /api/notifications/unread
 * Get only unread notifications
 */
router.get('/unread', NotificationController.getUnreadNotifications);

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
router.get('/stats', NotificationController.getStats);

/**
 * PUT /api/notifications/:notificationId/read
 * Mark a single notification as read
 */
router.put('/:notificationId/read', NotificationController.markAsRead);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', NotificationController.markAllAsRead);

/**
 * DELETE /api/notifications/:notificationId
 * Delete a single notification
 */
router.delete('/:notificationId', NotificationController.deleteNotification);

/**
 * DELETE /api/notifications
 * Delete all notifications
 */
router.delete('/', NotificationController.deleteAllNotifications);

export default router;
