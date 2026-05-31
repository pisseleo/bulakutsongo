# Realtime Notifications System - Setup Checklist

## Backend Setup

### ✅ Files Created/Updated

- [x] **Service Layer**
  - `src/services/notification.service.ts` - Enhanced with PostgreSQL-only operations
  - `src/services/typing.service.ts` - New typing indicator service (Redis-based)
  - `src/services/presence.service.ts` - Updated to remove Firebase dependency

- [x] **Controller**
  - `src/controllers/Notification.controller.ts` - New notification REST endpoints

- [x] **Routes**
  - `src/routes/notification.routes.ts` - New notification API routes
  - `src/app.ts` - Updated with notification routes

- [x] **Socket Handlers**
  - `src/socket/socket.ts` - Updated with notification and typing handlers

- [x] **Types**
  - `src/types/index.ts` - Added notification type definitions

### ✅ Database

The schema already has:
```prisma
model Notification {
  id         String           @id @default(uuid())
  user_id    String
  type       NotificationType
  title      String
  body       String
  data       Json
  read       Boolean          @default(false)
  created_at DateTime         @default(now())
  user       User             @relation(...)
}

enum NotificationType {
  NEW_MESSAGE
  MENTION
  GROUP_CREATED
  GROUP_INVITE
  MEMBER_JOINED
}
```

**Recommended:** Run migrations if needed
```bash
npm run prisma:migrate
```

### ✅ Services Already Working

- PostgreSQL: For persistent notification storage
- Redis: For caching and typing indicators
- Socket.IO: For real-time delivery
- JWT Authentication: For API security

## Frontend Setup

### ✅ Files Created/Updated

- [x] **Service Layer**
  - `src/services/notification.service.ts` - Notification API client

- [x] **Context & State**
  - `src/context/Notification.context.tsx` - React Context for notifications

- [x] **Components**
  - `src/app/components/Notifications/Notification.tsx` - UI components
    - NotificationItem: Single notification display
    - NotificationList: List of notifications
    - NotificationBell: Badge with unread count
    - NotificationPanel: Sliding panel with all notifications

### 📋 Integration Steps

1. **Update `layout.tsx`** - Wrap app with NotificationProvider
   ```typescript
   import { NotificationProvider } from '@/context/Notification.context';
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           <NotificationProvider>
             {children}
           </NotificationProvider>
         </body>
       </html>
     );
   }
   ```

2. **Add Notification Bell to Navigation**
   ```typescript
   import { NotificationBell, NotificationPanel } from '@/app/components/Notifications/Notification';
   import { useState } from 'react';
   
   export function Navigation() {
     const [panelOpen, setPanelOpen] = useState(false);
     
     return (
       <>
         <NotificationBell onClick={() => setPanelOpen(true)} />
         <NotificationPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
       </>
     );
   }
   ```

## Testing

### Backend - Test Notification Creation

1. **Via API** (replace tokens with real values):
```bash
# Get your JWT token first (from login)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'

# Then create a notification
TOKEN="your-jwt-token"
USER_ID="recipient-user-id"

curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "type": "NEW_MESSAGE",
    "title": "Test Sender",
    "body": "This is a test notification"
  }'
```

2. **Via Code** (in a service method or controller):
```typescript
import { createAndDeliverNotification } from '@/services/notification.service';

await createAndDeliverNotification({
  userId: 'recipient-id',
  type: 'NEW_MESSAGE',
  title: 'John Doe',
  body: 'Hello! How are you?',
  data: { conversationId: 'conv-123' },
});
```

### Frontend - Test Notifications

1. **Open two browser tabs** (or windows)
   - Tab 1: Logged in as User A
   - Tab 2: Logged in as User B

2. **Create a notification** from Tab 2:
   - Use the backend API to send a notification to User A
   - Should appear instantly in Tab 1

3. **Test actions**:
   - Click to mark as read
   - Click to delete
   - Should update in real-time

### Socket.IO Connection Test

```typescript
// In browser console
console.log('Socket connected:', socket.connected);
console.log('Socket ID:', socket.id);
```

## Environment Variables

### Backend (`.env`)

```bash
# Already set up, verify these exist:
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-secret
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (`.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

## API Endpoints Reference

```
GET    /api/notifications                    - Get all notifications
GET    /api/notifications/unread             - Get unread only
GET    /api/notifications/stats              - Get unread count
PUT    /api/notifications/:id/read           - Mark one as read
PUT    /api/notifications/read-all           - Mark all as read
DELETE /api/notifications/:id                - Delete one
DELETE /api/notifications                    - Delete all
```

## Socket Events Reference

```
Server → Client:
  notification:new           - New notification arrived
  notification:read          - Notification marked as read
  notification:deleted       - Notification deleted
  notifications:read-all     - All marked as read
  notifications:deleted-all  - All deleted

Client → Server:
  notification:read          - Emit when marked as read
```

## Troubleshooting

### Issue: Notifications not persisting
**Solution**: Ensure PostgreSQL is running and connection string is correct
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Issue: Real-time updates not working
**Solution**: Check Socket.IO connection
```typescript
// In browser console
console.log(socket.connected, socket.id);
// Should be: true, "socket-id-string"
```

### Issue: Auth middleware errors
**Solution**: Ensure JWT token is being sent
```typescript
// Verify header in network tab:
// Authorization: Bearer eyJhbGc...
```

### Issue: CORS errors
**Solution**: Update CORS settings
```typescript
// In socket.ts
cors: {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}
```

## Performance Optimization

1. **Enable Database Indexes** (recommended)
   ```sql
   CREATE INDEX idx_notifications_user_id ON notifications(user_id);
   CREATE INDEX idx_notifications_created_at ON notifications(created_at);
   CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
   ```

2. **Configure Redis Persistence**
   - Typing indicators expire automatically (10 seconds)
   - Presence expires after 65 seconds
   - Unread cache expires after 5 minutes

3. **Frontend Pagination**
   - Default: 50 notifications per page
   - Max: 100 notifications per page
   - Implement infinite scroll for large lists

## Next Steps

1. ✅ **Backend**: Test notification creation via API
2. ✅ **Frontend**: Integrate NotificationProvider and components
3. ✅ **Test**: Create test notifications and verify real-time delivery
4. 📋 **Enhance**: Add sound/desktop notifications
5. 📋 **Monitor**: Set up logging and monitoring
6. 📋 **Scale**: Configure Redis cluster for production

## Documentation

- [Notifications System Documentation](./NOTIFICATIONS_SYSTEM.md)
- [Frontend Integration Guide](./FRONTEND_NOTIFICATIONS_GUIDE.md)

## Removed Firebase Dependencies

The system no longer requires:
- ❌ Firebase Firestore for notifications
- ❌ Firebase Cloud Messaging (FCM) for push
- ❌ Firebase Storage listeners

Instead uses:
- ✅ PostgreSQL for persistence
- ✅ Redis for caching
- ✅ Socket.IO for real-time delivery
- ✅ (Optional) FCM for mobile push in future

## Support

For issues or questions:
1. Check the documentation files
2. Review the code comments
3. Check browser/server logs
4. Test with simple examples first
