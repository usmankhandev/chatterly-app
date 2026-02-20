import { PrismaClient } from '@prisma/client';
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cache.service';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

export class UserService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get user profile including settings (for authenticated users)
   */
  async getUserProfileWithSettings(userId: string) {
    const cacheKey = CACHE_KEYS.USER_SETTINGS(userId);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(
          `Fetching user profile with settings from database: ${userId}`,
        );
        const user = await this.fetchUserProfile(userId);
        return user || null;
      },
      CACHE_TTL.USER_SETTINGS,
    );
  }

  /**
   * Get user profile with settings by user ID
   */
  private async fetchUserProfile(userId: string) {
    logger.debug(
      `Fetching user profile with settings from database: ${userId}`,
    );
    return await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstname: true,
        lastname: true,
        email: true,
        bio: true,
        profilePicture: true,
        createdAt: true,
        isOnline: true,
        lastSeen: true,
        mfaEnabled: true,
        visibility: true,
        accountStatus: true,
      },
    });
  }
}
