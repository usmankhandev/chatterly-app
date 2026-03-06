import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { presenceService } from '../services/presence.service';
import { notificationEmitter } from './modules/notifications/emitters';
import { socketAuth } from './middlewares/socketAuth';

// NOTE: notificationEmitter methods require an active io instance

interface ConnectedUser {
  socketId: string;
  userId: string;
}

export class SocketServer {
  private io: Server | null = null;
  private connectedUsers: Map<string, ConnectedUser[]> = new Map();

  initialize(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        // origin: process.env.FRONTEND_URL || 'http://localhost:3001',
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 6000,
      pingInterval: 25000,
    });

    // Apply authentication middleware
    this.io.use(socketAuth);

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

  getIO(): Server | null {
    return this.io;
  }

  // ------------ notification helpers ----------------
  /**
   * Send a new notification object to a specific user socket room
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendNotificationToUser(userId: string, notification: any) {
    if (!this.io) return;
    notificationEmitter.sendNotificationToUser(userId, notification, this.io);
  }

  /**
   * Broadcast updated unread count to a user
   */
  sendUnreadCountToUser(userId: string, count: number) {
    if (!this.io) return;
    notificationEmitter.sendUnreadCountToUser(userId, count, this.io);
  }

  // /**

  /**
   * Broadcast notification-deleted event across all connections for a user
   */
  broadcastNotificationDeleted(userId: string, notificationId: string) {
    if (!this.io) return;
    notificationEmitter.broadcastNotificationDeleted(
      userId,
      notificationId,
      this.io,
    );
  }

  broadcastNotificationRead(userId: string, notificationId: string) {
    if (!this.io) return;
    notificationEmitter.broadcastNotificationRead(
      userId,
      notificationId,
      this.io,
    );
  }
}

export const socketServer = new SocketServer();
