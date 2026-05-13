# Notification Service Refactoring - Integration with Socket.io Server

## Overview

The notification service has been refactored to incorporate the Socket.io server, enabling real-time notification delivery and synchronization across multiple client connections.

## Key Changes

### 1. Socket Server Enhancements (`socket/socket.server.ts`)

#### New Notification Methods

- **`sendNotificationToUser(userId, notification)`**: Sends a new notification to a specific user via the `notification:new` event
- **`sendUnreadCountToUser(userId, count)`**: Sends updated unread count via the `notification:unread-count` event
- **`broadcastNotificationRead(userId, notificationId)`**: Broadcasts notification read status across all user connections
- **`broadcastNotificationDeleted(userId, notificationId)`**: Broadcasts notification deletion across all user connections

#### New Socket Event Listeners

- **`notification:read`**: Handles when a user marks a notification as read
- **`notification:delete`**: Handles when a user deletes a notification
- **`notification:get-unread-count`**: Handles unread count requests from clients

#### Event Flow

```
Client sends: notification:read(notificationId)
    ↓
Socket Server receives & broadcasts to all user connections
    ↓
Service updates database & emits unread count update
    ↓
All clients receive updated state
```

### 2. Notification Service Updates (`services/notification.service.ts`)

#### Enhanced Notification Creation

```typescript
// createNotification() now:
1. Creates notification in database
2. Emits notification:new event to user
3. Fetches and broadcasts updated unread count
```

#### Improved Mark As Read

```typescript
// markAsRead() now:
1. Updates notification as read with timestamp
2. Fetches complete notification with actor details
3. Broadcasts notification:read event
4. Sends updated unread count to user
```

#### Enhanced Delete Notification

```typescript
// deleteNotification() now:
1. Validates notification ownership
2. Deletes notification from database
3. Broadcasts notification:deleted event
4. Sends updated unread count to user
5. Returns success response with metadata
```

#### Mark All As Read

- Broadcasts updated unread count (0) to user
- Returns count of marked notifications

## Socket Events Reference

### Client → Server

| Event                           | Payload                  | Description                      |
| ------------------------------- | ------------------------ | -------------------------------- |
| `notification:read`             | `notificationId: string` | Mark single notification as read |
| `notification:delete`           | `notificationId: string` | Delete single notification       |
| `notification:get-unread-count` | (none)                   | Request current unread count     |

### Server → Client

| Event                       | Payload                      | Description                 |
| --------------------------- | ---------------------------- | --------------------------- |
| `notification:new`          | `Notification Object`        | New notification received   |
| `notification:unread-count` | `{ count: number }`          | Unread count update         |
| `notification:read`         | `{ notificationId: string }` | Notification marked as read |
| `notification:deleted`      | `{ notificationId: string }` | Notification deleted        |

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REST API / Socket Events                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Notification Service                           │
│  - Create Notification                                      │
│  - Mark As Read                                             │
│  - Delete Notification                                      │
│  - Get Unread Count                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼─────────────┐    ┌──────────▼──────────┐
│  Prisma Database    │    │  Socket.io Server   │
│  (Persistent Data)  │    │  (Real-time Sync)   │
└─────────────────────┘    └─────────┬───────────┘
                                     │
                          ┌──────────▼─────────┐
                          │  Client Applications│
                          │  (All Connections) │
                          └────────────────────┘
```

## Operational Standards

### 1. Real-time Synchronization

- All notification operations trigger socket events
- Multiple client connections stay synchronized
- Unread counts update across all devices

### 2. User Isolation

- Notifications sent to `user:${userId}` room
- Each user only receives their own notifications
- Authorization checks prevent unauthorized access

### 3. Error Handling

- NotificationError with specific codes and status codes
- Proper error propagation through socket and REST
- Logging for debugging

### 4. Database Consistency

- All changes persisted to Prisma database
- Atomic operations with includes/select for complete data
- Timestamps tracked (createdAt, readAt)

## Usage Example

### From Notification Service (Service-to-Service)

```typescript
// Create notification (with socket broadcast)
await notificationService.createNotification({
  userId: recipientId,
  actorId: senderId,
  type: "FRIEND_REQUEST",
  entityId: senderId,
  entityType: "USER",
});
// Automatically broadcasts to user via socket

// Mark as read (REST endpoint)
await notificationService.markAsRead(notificationId, userId);
// Automatically broadcasts read status via socket
```

### From Other Services

```typescript
// Helper methods for different notification types
await notificationService.notifyPostLike(postAuthorId, actorId, postId);
await notificationService.notifyPostComment(
  postAuthorId,
  actorId,
  postId,
  commentId,
);
await notificationService.notifyFriendRequest(receiverId, requesterId);
```

## Testing Checklist

- [ ] Socket connection established on user login
- [ ] New notification creates and broadcasts correctly
- [ ] Multiple clients receive same notification
- [ ] Mark as read updates all connected clients
- [ ] Delete notification broadcasts to all clients
- [ ] Unread count syncs across devices
- [ ] Unauthorized users cannot mark others' notifications as read
- [ ] Error cases properly handled and logged

## Future Enhancements

1. **Notification Preferences**: Add user settings for notification types
2. **Notification Expiration**: Auto-delete notifications after X days
3. **Batch Operations**: Efficiently handle multiple notifications
4. **Typing Indicators**: Real-time typing notifications
5. **Push Notifications**: Mobile push for offline users
6. **Notification Categories**: Organize by type/source

## Files Modified

1. `/server/src/socket/socket.server.ts` - Socket event handlers and broadcast methods
2. `/server/src/services/notification.service.ts` - Service integration with socket server
