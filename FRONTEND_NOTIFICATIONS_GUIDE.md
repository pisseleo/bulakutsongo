# Frontend Notification Integration Guide

## Overview

This guide shows how to integrate the realtime notification system into your Next.js frontend application.

## Setup

### 1. Wrap Your App with NotificationProvider

In your `layout.tsx` or root component:

```typescript
import { NotificationProvider } from '@/context/Notification.context';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <NotificationProvider>
          {/* Your other providers */}
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
```

### 2. Use the useNotifications Hook

```typescript
import { useNotifications } from '@/context/Notification.context';

export function MyComponent() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  // Your component logic
}
```

## Usage Examples

### Display Notification Bell with Badge

```typescript
import { NotificationBell } from '@/app/components/Notifications/Notification';

export function Header() {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <header>
      <nav className="flex items-center gap-4">
        {/* Other nav items */}
        <NotificationBell onClick={() => setPanelOpen(true)} />
      </nav>
    </header>
  );
}
```

### Display Notification Panel

```typescript
import { NotificationPanel } from '@/app/components/Notifications/Notification';

export function App() {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <NotificationPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
```

### Display Simple Notification List

```typescript
import { NotificationList } from '@/app/components/Notifications/Notification';
import { useNotifications } from '@/context/Notification.context';

export function NotificationsPage() {
  const { notifications, isLoading } = useNotifications();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      <NotificationList
        notifications={notifications}
        isLoading={isLoading}
        emptyMessage="No notifications yet"
      />
    </div>
  );
}
```

### Mark Notifications as Read

```typescript
export function MyComponent() {
  const { markAsRead, markAllAsRead } = useNotifications();

  const handleRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <>
      <button onClick={handleRead}>Mark as Read</button>
      <button onClick={handleReadAll}>Mark All as Read</button>
    </>
  );
}
```

### Listen for Real-time Notifications

The `NotificationProvider` automatically:
- Listens for new notifications via Socket.IO
- Updates the unread count in real-time
- Handles notification lifecycle events
- Manages local state synchronization

Real-time events are automatically integrated. When a new notification arrives:

```typescript
// This happens automatically
socket.on('notification:new', (notification) => {
  // Updates UI automatically
  setNotifications((prev) => [notification, ...prev]);
  setUnreadCount((prev) => prev + 1);
});
```

## API Integration

The notification service automatically handles:

### GET /api/notifications
Fetch all notifications

```typescript
const notifications = await notificationService.getAll(limit, offset);
```

### GET /api/notifications/unread
Fetch only unread notifications

```typescript
const unreadNotifications = await notificationService.getUnread(limit, offset);
```

### GET /api/notifications/stats
Get notification statistics

```typescript
const unreadCount = await notificationService.getStats();
```

### PUT /api/notifications/:id/read
Mark single notification as read

```typescript
await markAsRead(notificationId);
```

### PUT /api/notifications/read-all
Mark all notifications as read

```typescript
await markAllAsRead();
```

### DELETE /api/notifications/:id
Delete single notification

```typescript
await deleteNotification(notificationId);
```

### DELETE /api/notifications
Delete all notifications

```typescript
await deleteAllNotifications();
```

## Socket Events

The system automatically handles these Socket.IO events:

### Incoming Events

```typescript
// New notification arrives
socket.on('notification:new', (notification) => {
  // Automatically added to notifications array
});

// Notification marked as read
socket.on('notification:read', ({ notificationId }) => {
  // Automatically updated in UI
});

// Notification deleted
socket.on('notification:deleted', ({ notificationId }) => {
  // Automatically removed from UI
});

// All notifications read
socket.on('notifications:read-all', () => {
  // All notifications updated
});

// All notifications deleted
socket.on('notifications:deleted-all', () => {
  // All notifications cleared
});
```

### Outgoing Events

```typescript
// Emit notification read event
socket.emit('notification:read', notificationId);
```

## Notification Data Structure

```typescript
interface Notification {
  id: string;              // Unique identifier
  userId: string;          // User who received it
  type: string;            // Type: NEW_MESSAGE, MENTION, GROUP_CREATED, etc.
  title: string;           // Main text (sender name, action, etc.)
  body: string;            // Description/preview
  data?: {                 // Additional metadata
    conversationId?: string;
    groupId?: string;
    messageId?: string;
    [key: string]: any;
  };
  read: boolean;           // Read status
  createdAt: string;       // ISO timestamp
}
```

## Complete Example Component

```typescript
'use client';

import { useState } from 'react';
import {
  NotificationBell,
  NotificationPanel,
} from '@/app/components/Notifications/Notification';
import { useNotifications } from '@/context/Notification.context';

export function NotificationHub() {
  const [panelOpen, setPanelOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <>
      {/* Header with bell icon */}
      <header className="flex items-center justify-between p-4 bg-white border-b">
        <h1 className="text-xl font-bold">Chat App</h1>
        <div className="relative">
          <NotificationBell onClick={() => setPanelOpen(!panelOpen)} />
        </div>
      </header>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
      />

      {/* Main Content */}
      <main className="p-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
      </main>
    </>
  );
}
```

## Styling

The components use Tailwind CSS classes. If you're not using Tailwind, update the className attributes to match your CSS framework:

```typescript
// Example for Bootstrap
className="flex items-center gap-3 p-4 border rounded-lg transition-colors bg-light border-light-gray"

// Example for CSS Modules
className={`${styles.notification} ${!notification.read ? styles.unread : ''}`}
```

## Error Handling

All methods include error handling. Handle errors in your components:

```typescript
try {
  await markAsRead(notificationId);
} catch (error) {
  console.error('Error:', error);
  // Show user-friendly error message
}
```

## Performance Tips

1. **Pagination**: Use limit/offset for large notification lists
   ```typescript
   const notifications = await notificationService.getAll(50, 0);
   ```

2. **Lazy Loading**: Implement infinite scroll
   ```typescript
   const [offset, setOffset] = useState(0);
   const loadMore = async () => {
     const more = await notificationService.getAll(50, offset + 50);
     setOffset(offset + 50);
   };
   ```

3. **Caching**: The backend caches unread notifications for 5 minutes
   - First request: fetches from DB
   - Subsequent requests within 5 minutes: served from cache
   - Cache invalidates on notification changes

4. **Real-time Sync**: Socket.IO handles synchronization
   - No polling needed
   - Changes instantly reflected across tabs/devices
   - Browser tab in background receives updates

## Troubleshooting

### Notifications not arriving?

1. Check Socket.IO connection status
   ```typescript
   console.log(socket.connected);
   ```

2. Verify token is valid and sent to API
   ```typescript
   // In Socket.IO handshake
   socket.auth.token = 'your-jwt-token';
   ```

3. Check browser console for errors

### High network usage?

- The system is optimized with Redis caching
- Real-time delivery is efficient with Socket.IO
- API requests are minimal due to caching

### UI not updating?

1. Ensure NotificationProvider wraps your app
2. Use useNotifications hook in components
3. Check React DevTools for state changes

## Environment Setup

Make sure your environment variables are set:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

## Next Steps

1. Add notification sound on new message
2. Implement desktop notifications with Web Push API
3. Add notification filtering by type
4. Create notification preferences page
5. Add email digest of important notifications
