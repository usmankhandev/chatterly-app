import { PrismaClient, User } from '@prisma/client';
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
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

export type PublicUserProfile = {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  bio: string | null;
  profilePictureUrl: string | null;
  createdAt: Date;
  isOnline: boolean;
  lastSeenAt: Date | null;
};

export class UserService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get user profile by ID with caching
   * Returns null if user not found
   */
  async getUserProfile(userId: string): Promise<PublicUserProfile | null> {
    const cacheKey = CACHE_KEYS.USER_PROFILE(userId);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Fetching user profile from database: ${userId}`);
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            firstname: true,
            lastname: true,
            bio: true,
            profilePictureUrl: true,
            createdAt: true,
            isOnline: true,
            lastSeenAt: true,
          },
        });

        if (!user) {
          return null;
        }

        return user as PublicUserProfile;
      },
      CACHE_TTL.USER_PROFILE,
    );
  }

  /**
   * Get multiple user profiles in bulk
   * Reduces N+1 query problem
   */
  async getUserProfiles(
    userIds: string[],
  ): Promise<Map<string, PublicUserProfile | null>> {
    const result = new Map<string, PublicUserProfile | null>();
    const missingIds: string[] = [];

    // Try to get from cache first
    for (const userId of userIds) {
      const cacheKey = CACHE_KEYS.USER_PROFILE(userId);
      const cached = await cacheService.get<PublicUserProfile>(cacheKey);

      if (cached !== null) {
        result.set(userId, cached);
        logger.debug(`Cache hit for user profile: ${userId}`);
      } else {
        missingIds.push(userId);
      }
    }

    // Fetch missing profiles from database
    if (missingIds.length > 0) {
      logger.debug(`Fetching ${missingIds.length} missing user profiles`);
      const users = await this.prisma.user.findMany({
        where: {
          id: {
            in: missingIds,
          },
        },
        select: {
          id: true,
          username: true,
          firstname: true,
          lastname: true,
          bio: true,
          profilePictureUrl: true,
          createdAt: true,
          isOnline: true,
          lastSeenAt: true,
        },
      });

      // Cache fetched profiles
      for (const user of users) {
        const cacheKey = CACHE_KEYS.USER_PROFILE(user.id);
        await cacheService.set(sult.set(  Mark non-existent users
      for (const userId of missingIds) {
        if (!result.has(userId)) {
          result.set(userId, null);
        }
      }
    }

    return result;
  }

  /**
   * Get user profile including settings (for authenticated users)
   */
  async getUserProfileWithSettings(userId: string): Promise<any> {
    const cacheKey = CACHE_KEYS.USER_SETTINGS(userId);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(
          `Fetching user profile with settings from database: ${userId}`,
        );
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            firstname: true,
            lastname: true,
            email: true,
            bio: true,
            profilePictureUrl: true,
            createdAt: true,
            isOnline: true,
            lastSeenAt: true,
            emailNotificationsEnabled: true,
            smsNotificationsEnabled: true,
            privacyLevel: true,
            twoFactorEnabled: true,
          },
        });

        return user || null;
      },
      CACHE_TTL.USER_SETTINGS,
    );
  }

  /**
   * Invalidate user profile cache
   * Call this when user profile is updated
   */
  async invalidateUserProfileCache(userId: string): Promise<void> {
    const profileKey = CACHE_KEYS.USER_PROFILE(userId);
    const settingsKey = CACHE_KEYS.USER_SETTINGS(userId);

    await Promise.all([
      cacheService.delete(profileKey),
      cacheService.delete(settingsKey),
    ]);

    logger.info(`Invalidated cache for user: ${userId}`);
  }

  /**
   * Update user profile and invalidate cache
   */
  async updateUserProfile(
    userId: string,
    data: {
      firstname?: string;
      lastname?: string;
      bio?: string;
      profilePictureUrl?: string;
    },
  ): Promise<PublicUserProfile | null> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          username: true,
          firstname: true,
          lastname: true,
          bio: true,
          profilePictureUrl: true,
          createdAt: true,
          isOnline: true,
          lastSeenAt: true,
        },
      });

      // Invalidate cache
      await this.invalidateUserProfileCache(userId);

      // Re-cache the updated profile
      const cacheKey = CACHE_KEYS.USER_PROFILE(userId);
      await cacheService.set(cacheKey, updatedUser, CACHE_TTL.USER_PROFILE);

      return updatedUser as PublicUserProfile;
    } catch (error) {
      logger.error(`Error updrow error
  /**
   * Update user online status
   */
  async updateUserOnlineStatus(
    userId: string,
    isOnline: boolean,
  ): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isOnline,
    
   ,
  
          lastSeenAt: new Date(),
        },
      });

      // Invalidate cache to reflect new status
      await this.invalidateUserProfileCache(userId);
    } catch (error) {
      logger.error(`Error updating user online status: ${userId}`, error);
    }
  }

  /**
   * Search users by username with caching
   */
  async searchUsers(
    query: string,
    limit: number = 10,
  ): Promise<PublicUserProfile[]> {
    // Cache key includes query and limit for variations
    const cacheKey = `search:users:${query}:${limit}`;

    return (
      (await cacheService.getOrSet(
        cacheKey,
        async () => {
          logger.debug(`Searching users for query: ${query}`);
          const users = await this.prisma.user.findMany({
            where: {
              OR: [
                {
                  username: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  firstname: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  lastname: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
              ],
            },
            select: {
              id: true,
              username: true,
              firstname: true,
              lastname: true,
              bio: true,
              profilePictureUrl: true,
              createdAt: true,
              isOnline: true,
              lastSeenAt: true,
            },
            take: limit,
          });

          return users as PublicUserProfile[];
        },
        CACHE_TTL.SHORT_LIVED,
      )) || []
    );
  }

  /**
   * Get user's friends list with caching
   */
  async getUserFriends(userId: string): Promise<PublicUserProfile[]> {
    const cacheKey = CACHE_KEYS.USER_FRIENDS(userId);

    return (
      (await cacheService.getOrSet(
        cacheKey,
        async () => {
          logger.debug(`Fetching friends list for user: ${userId}`);
          const friendships = await this.prisma.friendShip.findMany({
            where: {
              OR: [
                { requesterId: userId, status: 'ACCEPTED' },
                { receiverId: userId, status: 'ACCEPTED' },
              ],
            },
            include: {
              requester: {
                select: {
                  id: true,
                  username: true,
                  firstname: true,
                  lastname: true,
                  bio: true,
                  profilePictureUrl: true,
                  createdAt: true,
                  isOnline: true,
                  lastSeenAt: true,
                },
              },
              receiver: {
                select: {
                  id: true,
                  username: true,
                  firstname: true,
                  lastname: true,
                  bio: true,
                  profilePictureUrl: true,
                  createdAt: true,
                  isOnline: true,
                  lastSeenAt: true,
                },
              },
            },
          });

          // Extract friend profiles
          const friends: PublicUserProfile[] = [];
          for (const friendship of friendships) {
            if (friendship.requesterId === userId) {
              friends.push(friendship.receiver as PublicUserProfile);
            } else {
              friends.push(friendship.requester as PublicUserProfile);
            }
          }

          return friends;
        },
        CACHE_TTL.USER_FRIENDS,
      )) || []
    );
  }

  /**
   * Invalidate friends list cache when friendship status changes
   */
  async invalidateFriendsCacheForBoth(
    userId1: string,
    userId2: string,
  ): Promise<void> {
    await Promise.all([
      cacheService.delete(CACHE_KEYS.USER_FRIENDS(userId1)),
      cacheService.delete(CACHE_KEYS.USER_FRIENDS(userId2)),
      this.invalidateUserProfileCache(userId1),
      this.invalidateUserProfileCache(userId2),
    ]);

    logger.info(`Invalidated cache for users: ${userId1}, ${userId2}`);
  }

  /**
   * Get user statistics (followers, following, posts count)
   */
  async getUserStats(userId: string): Promise<{
    friendsCount: number;
    postsCount: number;
    followersCount: number;
  } | null> {
    const cacheKey = `user:stats:${userId}`;

    return (
      (await cacheService.getOrSet(
        cacheKey,
        async () => {
          const friendships = await this.prisma.friendShip.count({
            where: {
              OR: [
                { requesterId: userId, status: 'ACCEPTED' },
                { receiverId: userId, status: 'ACCEPTED' },
              ],
            },
          });

          const posts = await this.prisma.post.count({
            where: { authorId: userId },
          });

          // followers = users who sent request that was accepted
          const followers = await this.prisma.friendShip.count({
            where: {
              receiverId: userId,
              status: 'ACCEPTED',
            },
          });

          return {
            friendsCount: friendships,
            postsCount: posts,
            followersCount: followers,
          };
        },
        CACHE_TTL.MEDIUM_LIVED,
      )) || null
    );
  }
}

export default UserService;
