# Realtime Notifications System - Documentation

## Overview
This document describes the complete realtime notifications system for the chat application, now powered by PostgreSQL and Socket.IO, completely removing Firebase dependencies for notifications.

## Architecture

### Components
1. **Backend (Node.js/Express)**
   - Notification Service: Handles notification creation, delivery, and persistence
   - Notification Controller: REST API endpoints
   - Socket Handlers: Real-time delivery via WebSockets
   - Database: PostgreSQL (Notification model)

2. **Frontend (Next.js/React)**
   - Notification Provider: Context-based state management
   - Notification Service: API client
   - Socket Listener: Real-time updates via Socket.IO
   - UI Components: Notification display & management

3. **Data Store**
   - PostgreSQL: Persistent notification storage
   - Redis: Caching, typing indicators, presence
   - Socket.IO: Real-time message delivery

## Notification Types

```typescript
enum NotificationType {
  NEW_MESSAGE      // Someone sent a message in a conversation
  MENTION          // You were mentioned in a message
  GROUP_CREATED    // A new group was created
  GROUP_INVITE     // You were invited to a group
  MEMBER_JOINED    // Someone joined a group
}
```

## Backend APIs

### REST Endpoints

#### Get All Notifications
```
GET /api/notifications?limit=50&offset=0

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "NEW_MESSAGE",
      "title": "John Doe",
      "body": "Hello there!",
      "data": { "conversationId": "uuid" },
      "read": false,
      "createdAt": "2026-05-31T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Get Unread Notifications
```
GET /api/notifications/unread?limit=50&offset=0

Response: Same structure as above, but only unread notifications
```

#### Get Notification Stats
```
GET /api/notifications/stats

Response:
{
  "success": true,
  "data": {
    "unreadCount": 3
  }
}
```

#### Mark Single Notification as Read
```
PUT /api/notifications/:notificationId/read

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "type": "NEW_MESSAGE",
    "title": "John Doe",
    "body": "Hello there!",
    "data": { "conversationId": "uuid" },
    "read": true,
    "createdAt": "2026-05-31T10:30:00Z"
  }
}
```

#### Mark All Notifications as Read
```
PUT /api/notifications/read-all

Response:
{
  "success": true,
  "message": "Marked 5 notifications as read",
  "count": 5
}
```

#### Delete Single Notification
```
DELETE /api/notifications/:notificationId

Response:
{
  "success": true,
  "message": "Notification deleted"
}
```

#### Delete All Notifications
```
DELETE /api/notifications

Response:
{
  "success": true,
  "message": "Deleted 5 notifications",
  "count": 5
}
```

## Socket.IO Events

### Client → Server

#### Mark Notification as Read (Real-time)
```typescript
socket.emit('notification:read', notificationId: string);
```

### Server → Client

#### New Notification Arrives
```typescript
socket.on('notification:new', (notification) => {
  // notification: NotificationPayload
});
```

#### Notification Marked as Read
```typescript
socket.on('notification:read', (data) => {
  // data: { notificationId: string }
});
```

#### Notification Deleted
```typescript
socket.on('notification:deleted', (data) => {
  // data: { notificationId: string }
});
```

#### All Notifications Marked as Read
```typescript
socket.on('notifications:read-all', () => {
  // All notifications marked as read
});
```

#### All Notifications Deleted
```typescript
socket.on('notifications:deleted-all', () => {
  // All notifications deleted
});
```

## Service Usage (Backend)

### Create and Deliver Notification

```typescript
import { createAndDeliverNotification } from '../services/notification.service';

// Send a new message notification
await createAndDeliverNotification({
  userId: 'recipient-id',
  type: 'NEW_MESSAGE',
  title: 'John Doe',
  body: 'Check out this amazing feature!',
  data: { conversationId: 'conv-123' },
  conversationId: 'conv-123', // Optional
});
```

### Notify All Conversation Members

```typescript
import { notifyNewMessage } from '../services/notification.service';

// Automatically notifies all members except sender
await notifyNewMessage(
  conversationId: 'conv-123',
  senderId: 'john-123',
  senderName: 'John Doe',
  preview: 'Check out this amazing feature!',
);
```

### Fetch Notifications

```typescript
import {
  getUnreadNotifications,
  getAllNotifications,
} from '../services/notification.service';

const { notifications, total } = await getUnreadNotifications(userId, 50, 0);
const all = await getAllNotifications(userId, 50, 0);
```

### Mark as Read

```typescript
import { markNotificationAsRead, markAllNotificationsAsRead } from '../services/notification.service';

// Single
await markNotificationAsRead(notificationId, userId);

// All
await markAllNotificationsAsRead(userId);
```

### Delete Notifications

```typescript
import { deleteNotification, deleteAllNotifications } from '../services/notification.service';

// Single
await deleteNotification(notificationId, userId);

// All
await deleteAllNotifications(userId);
```

## Database Schema

### Notification Model

```prisma
model Notification {
  id         String           @id @default(uuid())
  user_id    String
  type       NotificationType
  title      String
  body       String
  data       Json             // Metadata (e.g., conversationId)
  read       Boolean          @default(false)
  created_at DateTime         @default(now())
  user       User             @relation(fields: [user_id], references: [id], onDelete: Cascade)
}

enum NotificationType {
  NEW_MESSAGE
  MENTION
  GROUP_CREATED
  GROUP_INVITE
  MEMBER_JOINED
}
```

## Caching Strategy

- **Unread notifications**: Cached for 5 minutes in Redis
- **All notifications**: Not cached (fetched on demand)
- **Cache invalidation**: Triggered on notification creation, read, or deletion

## Performance Considerations

1. **Real-time Delivery**: Socket.IO ensures instant delivery to connected clients
2. **Offline Support**: Notifications persist in PostgreSQL and are fetched on reconnect
3. **Scalability**: Redis adapter allows Socket.IO to work across multiple server instances
4. **Database Indexing**: Add indexes on `user_id` and `created_at` for optimal query performance

### Recommended Indexes

```sql
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
```

## Integration Examples

### In Message Controller

When a new message is created:

```typescript
import { notifyNewMessage } from '../services/notification.service';

// After message is saved
const message = await prisma.message.create({
  data: { /* ... */ },
});

// Notify all recipients
await notifyNewMessage(
  conversationId,
  userId,
  user.full_name,
  message.content?.substring(0, 80) || '[Media]',
);
```

### In Group Management

When creating a group:

```typescript
import { createAndDeliverNotification } from '../services/notification.service';

// For each member being added
await Promise.all(
  members.map((memberId) =>
    createAndDeliverNotification({
      userId: memberId,
      type: 'GROUP_CREATED',
      title: `${creatorName} created "${groupName}"`,
      body: `You were added to ${groupName}`,
      data: { groupId: group.id },
    }),
  ),
);
```

## Error Handling

All notification services implement proper error handling:

- Socket delivery failures are logged but don't fail the notification creation
- Database errors are propagated to the caller
- Cache misses fall back to database queries
- Expired Redis keys are handled gracefully

## Future Enhancements

1. **Notification Preferences**: Allow users to configure which notification types they receive
2. **Notification Categories**: Group similar notifications
3. **Smart Bundling**: Combine multiple notifications into one
4. **Email Notifications**: Send digest emails for offline users
5. **Web Push API**: Send browser notifications
6. **Read Receipts**: Track when notifications are read
7. **Notification Actions**: Allow quick actions from notifications

## Migration from Firebase

If migrating from Firebase:

1. ✅ Notifications stored in PostgreSQL instead of Firestore
2. ✅ Real-time delivery via Socket.IO instead of Firebase Cloud Messaging
3. ✅ Presence tracking via Redis instead of Firestore
4. ✅ Typing indicators via Redis instead of Firestore
5. **Note**: FCM tokens are still stored for potential mobile push notifications in future

## Testing

### Create Test Notification

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "type": "NEW_MESSAGE",
    "title": "Test",
    "body": "This is a test notification"
  }'
```

### Get Notifications

```bash
curl http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Mark as Read

```bash
curl -X PUT http://localhost:3000/api/notifications/notif-id/read \
  -H "Authorization: Bearer YOUR_TOKEN"
```
