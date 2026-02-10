import { PrismaClient, NotificationType, Prisma } from '@prisma/client';
import {
  CreateNotificationInput,
  GetNotificationsQueryInput,
} from '../schema/notification.schema';
import { socketServer } from '../socket/socket.server';
export class NotificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'NotificationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const Notification_Message: Record<
  NotificationType,
  (actorName: string) => string
> = {
  POST_COMMENT: (actorName: string) => `${actorName} commented on your post.`,
  FRIEND_REQUEST: (actorName: string) =>
    `${actorName} sent you a friend request.`,
  FRIEND_ACCEPT: (actorName: string) =>
    `${actorName} accepted your friend request.`,
  REPLY_COMMENT: (actorName: string) => `${actorName} replied to your comment.`,
  MENTION: (actorName: string) => `${actorName} mentioned you in a post.`,
  POST_LIKE: (actorName: string) => `${actorName} liked your post.`,
  COMMENT_LIKE: (actorName: string) => `${actorName} liked your comment.`,
};

export class NotificationService {
  constructor(private prisma: PrismaClient) {}

  // Create Notification
  async createNotification(data: CreateNotificationInput) {
    const { actorId } = data;
    try {
      if (data.userId === data.actorId) return null;

      // Get actor's name for message
      const actor = await this.prisma.user.findUnique({
        where: { id: actorId },
        select: { username: true, firstname: true, lastname: true },
      });

      if (!actor)
        throw new NotificationError('Actor not found', 'ACTOR_NOT_FOUND', 404);

      const actorName = actor.firstname
        ? `${actor.firstname} ${actor.lastname}`
        : actor.username;

      const message =
        Notification_Message[data.type as NotificationType](actorName);

      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          actorId: data.actorId,
          type: data.type,
          entityType: data.entityType,
          entityId: data.entityId,
          metaData: data.metaData || {},
          message,
          content: message,
        },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
              firstname: true,
              lastname: true,
            },
          },
        },
      });

      if (notification) {
        // Emit new notification to user
        socketServer.sendNotificationToUser(data.userId, notification);

        // Emit updated unread count to user
        const unreadCount = await this.getUnreadNotificationCount(data.userId);
        socketServer.sendUnreadCountToUser(data.userId, unreadCount);
      }

      return notification;
    } catch (error) {
      if (error instanceof NotificationError) throw error;
      console.error('Error creating notification:', error);
      throw new NotificationError(
        'Failed to create notification',
        'NOTIFICATION_CREATE_FAILED',
        500,
      );
    }
  }

  // Get user's notifications with pagination

  async getUserNotifications(
    userId: string,
    query: GetNotificationsQueryInput,
  ) {
    const { page, limit, unreadOnly } = query;

    try {
      const skip = (page - 1) * limit;
      const whereClause: Prisma.NotificationWhereInput = {
        userId,
      };
      if (unreadOnly) {
        whereClause.isRead = false;
      }

      const [notifications, totalCount, unreadCount] = await Promise.all([
        this.prisma.notification.findMany({
          where: whereClause,
          include: {
            actor: {
              select: {
                id: true,
                username: true,
                profilePicture: true,
                firstname: true,
                lastname: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.notification.count({ where: whereClause }),
        this.prisma.notification.count({
          where: { userId, isRead: false },
        }),
      ]);

      return {
        notifications,
        totalCount,
        unreadCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw new NotificationError(
        'Failed to fetch notifications',
        'NOTIFICATIONS_FETCH_FAILED',
        500,
      );
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string) {
    try {
      let notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification)
        throw new NotificationError(
          'Notification not found',
          'NOTIFICATION_NOT_FOUND',
          404,
        );

      if (notification.userId !== userId)
        throw new NotificationError('Unauthorized', 'UNAUTHORIZED', 403);

      notification = await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              profilePicture: true,
              firstname: true,
              lastname: true,
            },
          },
        },
      });

      // Broadcast notification read event
      socketServer.broadcastNotificationRead(userId, notificationId);

      // Update and send unread count
      const unreadCount = await this.getUnreadNotificationCount(userId);
      socketServer.sendUnreadCountToUser(userId, unreadCount);

      return notification;
    } catch (error) {
      if (error instanceof NotificationError) throw error;
      console.error('Error marking notification as read:', error);
      throw new NotificationError(
        'Failed to mark notification as read',
        'MARK_AS_READ_FAILED',
        500,
      );
    }
  }
  // Mark all notifications as read

  async markAllAsRead(userId: string) {
    try {
      const result = await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      socketServer.sendUnreadCountToUser(userId, 0);

      return {
        success: true,
        message: `${result.count} notifications marked as read.`,
        count: result.count,
      };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new NotificationError(
        'Failed to mark all notifications as read',
        'MARK_ALL_AS_READ_FAILED',
        500,
      );
    }
  }

  // Get unread notification count

  async getUnreadNotificationCount(userId: string) {
    try {
      return await this.prisma.notification.count({
        where: { userId, isRead: false },
      });
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      throw new NotificationError(
        'Failed to fetch unread notification count',
        'UNREAD_COUNT_FETCH_FAILED',
        500,
      );
    }
  }

  // Delete a notification
  async deleteNotification(notificationId: string, userId: string) {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification)
        throw new NotificationError(
          'Notification not found',
          'NOTIFICATION_NOT_FOUND',
          404,
        );

      if (notification.userId !== userId)
        throw new NotificationError('Unauthorized', 'UNAUTHORIZED', 403);

      await this.prisma.notification.delete({
        where: { id: notificationId },
      });

      // Broadcast notification deleted event
      socketServer.broadcastNotificationDeleted(userId, notificationId);

      // Update and send unread count
      const unreadCount = await this.getUnreadNotificationCount(userId);
      socketServer.sendUnreadCountToUser(userId, unreadCount);

      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotificationError) throw error;
      console.error('Error deleting notification:', error);
      throw new NotificationError(
        'Failed to delete notification',
        'DELETE_NOTIFICATION_FAILED',
        500,
      );
    }
  }

  // Delete all notifications for a user

  async deleteAllNotifications(userId: string) {
    try {
      const result = await this.prisma.notification.deleteMany({
        where: { userId },
      });
      return {
        success: true,
        message: `${result.count} notifications deleted.`,
        count: result.count,
      };
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw new NotificationError(
        'Failed to delete all notifications',
        'DELETE_ALL_NOTIFICATIONS_FAILED',
        500,
      );
    }
  }

  // ============================================
  // HELPER METHODS FOR OTHER SERVICES
  // ============================================

  async notifyPostLike(postAuthorId: string, actorId: string, postId: string) {
    return this.createNotification({
      userId: postAuthorId,
      actorId: actorId,
      type: 'POST_LIKE',
      entityId: postId,
      entityType: 'POST',
    });
  }

  async notifyCommentLike(
    commentAuthorId: string,
    actorId: string,
    commentId: string,
  ) {
    return this.createNotification({
      userId: commentAuthorId,
      actorId,
      type: 'COMMENT_LIKE',
      entityId: commentId,
      entityType: 'COMMENT',
    });
  }

  async notifyPostComment(
    postAuthorId: string,
    actorId: string,
    postId: string,
    commentId: string,
  ) {
    return this.createNotification({
      userId: postAuthorId,
      actorId,
      type: 'POST_COMMENT',
      entityId: postId,
      entityType: 'POST',
      metaData: { commentId },
    });
  }

  async notifyCommentReply(
    commentAuthorId: string,
    actorId: string,
    parentCommentId: string,
    replyId: string,
  ) {
    return this.createNotification({
      userId: commentAuthorId,
      actorId,
      type: 'REPLY_COMMENT',
      entityId: parentCommentId,
      entityType: 'COMMENT',
      metaData: { replyId },
    });
  }

  async notifyFriendRequest(receiverId: string, requesterId: string) {
    return this.createNotification({
      userId: receiverId,
      actorId: requesterId,
      type: 'FRIEND_REQUEST',
      entityId: requesterId,
      entityType: 'USER',
    });
  }

  async notifyFriendRequestAcceptance(requesterId: string, accepterId: string) {
    return this.createNotification({
      userId: requesterId,
      actorId: accepterId,
      type: 'FRIEND_ACCEPT',
      entityId: accepterId,
      entityType: 'USER',
    });
  }
}
