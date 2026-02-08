import prisma from '../config/prismaClient';

export class PresenceService {
  async markOnlineUser(userId: string, socketId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    const socketIds = user?.currentSocketIds || [];
    if (!socketIds.includes(socketId)) {
      socketIds.push(socketId);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: true,
        currentSocketIds: socketIds,
        lastSeen: new Date(),
      },
    });

    return true;
  }

  // Marking Offline

  async markOffline(userId: string, socketId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    
    const socketIds = (user.currentSocketIds || []).filter(id: string) => id !== socketId;
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentSocketIds: socketIds,
        isOnline: socketIds.length > 0, // if still online on another device
        lastSeen: new Date()
      }
    });
  }

  // Get User Presence

  async getOnlineStatus(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { isOnline: true, lastSeen: true }
    });
  }
}


export const presenceService = new PresenceService();