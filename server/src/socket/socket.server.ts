import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { presenceService } from '../services/presence.service';

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
}

export const socketServer = new SocketServer();
