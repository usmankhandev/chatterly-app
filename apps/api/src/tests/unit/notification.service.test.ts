import {
  NotificationService,
  NotificationError,
} from '../../services/notification.service';
import { prismaMock } from '../../config/__mocks__/prismaClient';
import { NotificationType, EntityType } from '@prisma/client';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    firstname: 'Test',
    lastname: 'User',
    profilePicture: null,
  };

  const mockActor = {
    id: 'actor-1',
    username: 'actoruser',
    firstname: 'Actor',
    lastname: 'User',
    profilePicture: null,
  };

  const mockNotification = {
    id: 'notification-1',
    userId: 'user-1',
    actorId: 'actor-1',
    type: 'POST_LIKE' as NotificationType,
    entityId: 'post-1',
    entityType: 'POST' as EntityType,
    message: 'Actor User liked your post',
    isRead: false,
    readAt: null,
    metadata: {},
    createdAt: new Date(),
    actor: mockActor,
  };

  beforeEach(() => {
    notificationService = new NotificationService(prismaMock);
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const createData = {
        userId: 'user-1',
        actorId: 'actor-1',
        type: 'POST_LIKE' as const,
        entityId: 'post-1',
        entityType: 'POST' as const,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockActor as any);
      prismaMock.notification.create.mockResolvedValue(mockNotification as any);

      const result = await notificationService.createNotification(createData);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: createData.actorId },
        select: { username: true, firstname: true, lastname: true },
      });

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: createData.userId,
          actorId: createData.actorId,
          type: createData.type,
          entityId: createData.entityId,
          entityType: createData.entityType,
          message: expect.any(String),
        }),
        include: expect.any(Object),
      });

      expect(result).toEqual(mockNotification);
    });

    it('should return null when userId equals actorId (self-notification)', async () => {
      const createData = {
        userId: 'user-1',
        actorId: 'user-1', // Same as userId
        type: 'POST_LIKE' as const,
        entityId: 'post-1',
        entityType: 'POST' as const,
      };

      const result = await notificationService.createNotification(createData);

      expect(result).toBeNull();
      expect(prismaMock.notification.create).not.toHaveBeenCalled();
    });

    it('should throw error if actor not found', async () => {
      const createData = {
        userId: 'user-1',
        actorId: 'non-existent-actor',
        type: 'POST_LIKE' as const,
      };

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        notificationService.createNotification(createData),
      ).rejects.toThrow(
        new NotificationError('Actor not found', 'ACTOR_NOT_FOUND', 404),
      );
    });

    it('should generate correct message for COMMENT_POST', async () => {
      const createData = {
        userId: 'user-1',
        actorId: 'actor-1',
        type: 'POST_COMMENT' as const,
        entityId: 'post-1',
        entityType: 'POST' as const,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockActor as any);
      prismaMock.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'POST_COMMENT',
        message: 'Actor User commented on your post',
      } as any);

      await notificationService.createNotification(createData);

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message: 'Actor User commented on your post',
        }),
        include: expect.any(Object),
      });
    });

    it('should generate correct message for FRIEND_REQUEST', async () => {
      const createData = {
        userId: 'user-1',
        actorId: 'actor-1',
        type: 'FRIEND_REQUEST' as const,
        entityId: 'actor-1',
        entityType: 'USER' as const,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockActor as any);
      prismaMock.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'FRIEND_REQUEST',
        message: 'Actor User sent you a friend request',
      } as any);

      await notificationService.createNotification(createData);

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message: 'Actor User sent you a friend request',
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications with pagination', async () => {
      const notifications = [
        mockNotification,
        { ...mockNotification, id: 'notification-2' },
      ];

      prismaMock.notification.findMany.mockResolvedValue(notifications as any);
      prismaMock.notification.count
        .mockResolvedValueOnce(2) // total
        .mockResolvedValueOnce(2); // unreadCount

      const result = await notificationService.getUserNotifications('user-1', {
        page: 1,
        limit: 20,
        unreadOnly: false,
      });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });

      expect(result.notifications).toEqual(notifications);
      // expect(result.pagination.total).toBe(2);
      expect(result.unreadCount).toBe(2);
    });

    it('should filter unread notifications only', async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        mockNotification,
      ] as any);
      prismaMock.notification.count.mockResolvedValue(1);

      await notificationService.getUserNotifications('user-1', {
        page: 1,
        limit: 20,
        unreadOnly: true,
      });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const updatedNotification = {
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      };

      prismaMock.notification.findUnique.mockResolvedValue(
        mockNotification as any,
      );
      prismaMock.notification.update.mockResolvedValue(
        updatedNotification as any,
      );

      const result = await notificationService.markAsRead(
        'notification-1',
        'user-1',
      );

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'notification-1' },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });

      expect(result.isRead).toBe(true);
    });

    it('should throw error if notification not found', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      await expect(
        notificationService.markAsRead('non-existent', 'user-1'),
      ).rejects.toThrow(
        new NotificationError(
          'Notification not found',
          'NOTIFICATION_NOT_FOUND',
          404,
        ),
      );
    });

    it('should throw error if user is not the owner', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(
        mockNotification as any,
      );

      await expect(
        notificationService.markAsRead('notification-1', 'different-user'),
      ).rejects.toThrow(
        new NotificationError('Unauthorized', 'NOTIFICATION_UNAUTHORIZED', 403),
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await notificationService.markAllAsRead('user-1');

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(5);
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count', async () => {
      prismaMock.notification.count.mockResolvedValue(10);

      const count =
        await notificationService.getUnreadNotificationCount('user-1');

      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });

      expect(count).toBe(10);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(
        mockNotification as any,
      );
      prismaMock.notification.delete.mockResolvedValue(mockNotification as any);

      const result = await notificationService.deleteNotification(
        'notification-1',
        'user-1',
      );

      expect(prismaMock.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notification-1' },
      });

      expect(result).toBe(true);
    });

    it('should throw error if notification not found', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      await expect(
        notificationService.deleteNotification('non-existent', 'user-1'),
      ).rejects.toThrow(
        new NotificationError(
          'Notification not found',
          'NOTIFICATION_NOT_FOUND',
          404,
        ),
      );
    });

    it('should throw error if user is not the owner', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(
        mockNotification as any,
      );

      await expect(
        notificationService.deleteNotification(
          'notification-1',
          'different-user',
        ),
      ).rejects.toThrow(
        new NotificationError('Unauthorized', 'NOTIFICATION_UNAUTHORIZED', 403),
      );
    });
  });

  // Helper method tests
  describe('notifyPostLike', () => {
    it('should create post like notification', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockActor as any);
      prismaMock.notification.create.mockResolvedValue(mockNotification as any);

      await notificationService.notifyPostLike('user-1', 'actor-1', 'post-1');

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          actorId: 'actor-1',
          type: 'LIKE_POST',
          entityId: 'post-1',
          entityType: 'POST',
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('notifyFriendRequest', () => {
    it('should create friend request notification', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockActor as any);
      prismaMock.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'FRIEND_REQUEST',
      } as any);

      await notificationService.notifyFriendRequest('user-1', 'actor-1');

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          actorId: 'actor-1',
          type: 'FRIEND_REQUEST',
          entityType: 'USER',
        }),
        include: expect.any(Object),
      });
    });
  });
});
