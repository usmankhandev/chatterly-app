import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Notification } from '@prisma/client';
import { TokenUtils } from '../utils/shared/auth.utils';
import { presenceService } from '../services/presence.service';

interface ConnectedUser {
  socketId: string;
  userId: string;
}

interface CommentData {
  id: string;
  [key: string]: unknown;
}

interface LikeData {
  id: string;
  [key: string]: unknown;
}

export class SocketServer {
  private io: Server | null = null;
  private connectedUsers: Map<string, ConnectedUser[]> = new Map();

  initialize(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3001',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 6000,
      pingInterval: 25000,
    });
    // Connection handler;

    this.io.on('connection', async (socket: Socket) => {
      const userId = socket.data.userId;

      await presenceService.markOnlineUser(userId, socket.id);

      // Emit to Friends

      this.io?.to(`friends:${userId}`).emit('friend:online', { userId });

      console.log(`🔌 User connected: ${userId} (socket: ${socket.id})`);

      // Add user to connected users map.

      this.addConnectedUser(userId, socket.id);

      // Join user's personal room for notification

      socket.join(`user: ${userId}`);

      // Handle disconnect.

      socket.on('disconnect', async () => {
        console.log(`🔌 User disconnected: ${userId} (socket: ${socket.id})`);
        await presenceService.markOffline(userId, socket.id);
        const user = await presenceService.getOnlineStatus(userId);
        if (user && !user.isOnline) {
          this.io
            ?.to(`friends:${userId}`)
            .emit('friend:offline', { userId, lastSeen: user.lastSeen });
        }
        this.removeConnectedUser(userId, socket.id);
      });

      // Example: Join post rooms

      socket.on('join:post', (postId: string) => {
        socket.join(`post: ${postId}`);
        console.log(`User ${userId} joined post room: ${postId}`);
      });

      socket.on('leave:post', (postId: string) => {
        socket.leave(`post: ${postId}`);
        console.log(`User ${userId} left the post room: ${postId}`);
      });

      // Marking notification as read via socket
      socket.on('notification:read', (notificationId: string) => {
        console.log(`User ${userId} read notification: ${notificationId}`);
        // Broadcast to all connections of this user
        this.broadcastNotificationRead(userId, notificationId);
      });

      // Handle notification deletion
      socket.on('notification:delete', (notificationId: string) => {
        console.log(`User ${userId} deleted notification: ${notificationId}`);
        this.broadcastNotificationDeleted(userId, notificationId);
      });

      // Fetch unread notifications count
      socket.on('notification:get-unread-count', async () => {
        // This will be handled by the notification service
        console.log(`User ${userId} requested unread count`);
      });
    });
    console.log(`Socket.io server initialized`);
    return this.io;
  }

  // Handler functions

  private addConnectedUser(userId: string, socketId: string) {
    const userSockets = this.connectedUsers.get(userId) || [];
    userSockets.push({ socketId, userId });
    this.connectedUsers.set(userId, userSockets);
  }

  private removeConnectedUser(userId: string, socketId: string) {
    const userSockets = this.connectedUsers.get(userId) || [];
    const filtered = userSockets.filter(
      (socket) => socket.socketId !== socketId,
    );

    if (filtered.length === 0) {
      this.connectedUsers.delete(userId);
    } else {
      this.connectedUsers.set(userId, filtered);
    }
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  getUserSocketCount(userId: string): number {
    return this.connectedUsers.get(userId)?.length || 0;
  }

  // ============================================
  // NOTIFICATION EMISSION METHODS
  // ============================================

  /**
   * Send notification to a specific user
   */
  sendNotificationToUser(userId: string, notification: Notification) {
    if (!this.io) return;
    this.io.to(`user: ${userId}`).emit('notification:new', notification);
  }

  /**
   * Send unread count to a specific user
   */
  sendUnreadCountToUser(userId: string, count: number) {
    if (!this.io) return;
    this.io.to(`user: ${userId}`).emit('notification:unread-count', { count });
  }

  /**
   * Broadcast new comment to post room
   */
  broadcastNewComment(postId: string, comment: CommentData) {
    if (!this.io) return;
    this.io.to(`post: ${postId}`).emit('post:new-comment', comment);
  }

  /**
   * Broadcast new like to post room
   */
  broadcastNewLike(postId: string, like: LikeData) {
    if (!this.io) return;
    this.io.to(`post: ${postId}`).emit('post:new-like', like);
  }

  /**
   * Broadcast like count update
   */
  broadcastLikeCount(postId: string, count: number) {
    if (!this.io) return;
    this.io.to(`post:${postId}`).emit('post:like-count', { postId, count });
  }

  /**
   * Broadcast notification read event to all clients of a user
   */
  broadcastNotificationRead(userId: string, notificationId: string) {
    if (!this.io) return;
    this.io.to(`user: ${userId}`).emit('notification:read', { notificationId });
  }

  /**
   * Broadcast notification deleted event to all clients of a user
   */
  broadcastNotificationDeleted(userId: string, notificationId: string) {
    if (!this.io) return;
    this.io

      .to(`user: ${userId}`)
      .emit('notification:deleted', { notificationId });
  }

  getIO(): Server | null {
    return this.io;
  }
}

export const socketServer = new SocketServer();
