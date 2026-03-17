import { SocketEvents } from '../../../constants/socketEvents';
import { notificationEmitter } from './emitters';
import { Server, Socket } from 'socket.io';

export function registerNotificationHandlers(socket: Socket, io: Server) {
  socket.on(SocketEvents.NOTIFICATION_READ, (notificationId) => {
    notificationEmitter.broadcastNotificationRead(
      socket.data.userId,
      notificationId,
      socket,
    );
  });

  socket.on(SocketEvents.NOTIFICATION_DELETE, (notificationId) => {
    notificationEmitter.broadcastNotificationDeleted(
      socket.data.userId,
      notificationId,
      socket,
    );
  });

  socket.on('join:post', (postId: string) => {
    socket.join(`post: ${postId}`);
  });

  socket.on('leave:post', (postId: string) => {
    socket.leave(`post: ${postId}`);
  });

  // Marking notification as read via socket
  socket.on('notification:read', (notificationId: string) => {
    // Broadcast to all connections of this user
    notificationEmitter.broadcastNotificationRead(
      socket.data.userId,
      notificationId,
      socket,
    );
  });

  // Handle notification deletion
  socket.on('notification:delete', (notificationId: string) => {
    notificationEmitter.broadcastNotificationDeleted(
      socket.data.userId,
      notificationId,
      socket,
    );
  });

  // Fetch unread notifications count
  socket.on('notification:get-unread-count', async () => {
    // This will be handled by the notification service
    console.log(`User ${socket.data.userId} requested unread count`);
  });
}
