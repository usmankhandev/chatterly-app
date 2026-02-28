import { Socket, Server } from 'socket.io';
import { Notification } from '@prisma/client';
import { NotificationEvents } from './events';

interface CommentData {
  id: string;
  [key: string]: unknown;
}

interface LikeData {
  id: string;
  [key: string]: unknown;
}

export const notificationEmitter = {
  // ============================================
  // NOTIFICATION EMISSION METHODS
  // ============================================

  /**
   * Send notification to a specific user
   */
  sendNotificationToUser: (
    userId: string,
    notification: Notification,
    io: Server | Socket,
  ) => {
    if (!io) return;
    io.to(`user: ${userId}`).emit(NotificationEvents.NEW, notification);
  },

  /**
   * Send unread count to a specific user
   */
  sendUnreadCountToUser: (
    userId: string,
    count: number,
    io: Server | Socket,
  ) => {
    if (!io) return;
    io.to(`user: ${userId}`).emit(NotificationEvents.GET_UNREAD_COUNT, {
      count,
    });
  },

  /**
   * Broadcast new comment to post room
   */
  broadcastNewComment: (
    postId: string,
    comment: CommentData,
    io: Server | Socket,
  ) => {
    if (!io) return;
    io.to(`post: ${postId}`).emit(NotificationEvents.NEW_COMMENT, comment);
  },

  /**
   * Broadcast new like to post room
   */
  broadcastNewLike: (postId: string, like: LikeData, io: Server | Socket) => {
    if (!io) return;
    io.to(`post: ${postId}`).emit(NotificationEvents.NEW_LIKE, like);
  },

  /**
   * Broadcast like count update
   */
  broadcastLikeCount: (postId: string, count: number, io: Server | Socket) => {
    if (!io) return;
    io.to(`post:${postId}`).emit('post:like-count', { postId, count });
  },

  /**
   * Broadcast notification read event to all clients of a user
   */
  broadcastNotificationRead: (
    userId: string,
    notificationId: string,
    io: Server | Socket,
  ) => {
    if (!io) return;
    io.to(`user: ${userId}`).emit(NotificationEvents.READ, { notificationId });
  },

  /**
   * Broadcast notification deleted event to all clients of a user
   */
  broadcastNotificationDeleted: (
    userId: string,
    notificationId: string,
    io: Server | Socket,
  ) => {
    if (!io) return;
    io.to(`user: ${userId}`).emit(NotificationEvents.DELETE, {
      notificationId,
    });
  },
};
