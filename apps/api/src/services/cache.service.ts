import { redisClientManager } from '../config/redisClient';
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

// Cache key constants for better organization
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_SETTINGS: (userId: string) => `user:settings:${userId}`,
  POST: (postId: string) => `post:${postId}`,
  POST_FEED: (userId: string, page: number = 1) =>
    `feed:user:${userId}:page:${page}`,
  COMMENT_THREAD: (postId: string) => `comments:post:${postId}`,
  FRIENDSHIP_LIST: (userId: string) => `friendships:${userId}`,
  USER_FRIENDS: (userId: string) => `friends:${userId}`,
};

// Default TTLs (in seconds)
export const CACHE_TTL = {
  USER_PROFILE: 30 * 60, // 30 minutes
  USER_SETTINGS: 60 * 60, // 1 hour
  POST: 15 * 60, // 15 minutes
  POST_FEED: 5 * 60, // 5 minutes
  COMMENT_THREAD: 10 * 60, // 10 minutes
  FRIENDSHIP_LIST: 15 * 60, // 15 minutes
  USER_FRIENDS: 30 * 60, // 30 minutes
  SHORT_LIVED: 5 * 60, // 5 minutes
  MEDIUM_LIVED: 30 * 60, // 30 minutes
  LONG_LIVED: 60 * 60, // 1 hour
};

export class CacheService {
  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found or on error
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = redisClientManager.getClient();
      if (!client || !redisClientManager.isHealthy()) {
        logger.debug('Cache get skipped - Redis not healthy');
        return null;
      }

      const value = await client.get(key);
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        // If not JSON, return as string
        return value as unknown as T;
      }
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds (optional)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const client = redisClientManager.getClient();
      if (!client || !redisClientManager.isHealthy()) {
        logger.debug('Cache set skipped - Redis not healthy');
        return false;
      }

      const serialized =
        typeof value === 'string' ? value : JSON.stringify(value);

      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }

      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   * @param key - Cache key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const client = redisClientManager.getClient();
      if (!client || !redisClientManager.isHealthy()) {
        logger.debug('Cache delete skipped - Redis not healthy');
        return false;
      }

      const result = await client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   * @param pattern - Key pattern (e.g., "user:*")
   */
  async deleteByPattern(pattern: string): Promise<number> {
    try {
      const client = redisClientManager.getClient();
      if (!client || !redisClientManager.isHealthy()) {
        logger.debug('Cache deleteByPattern skipped - Redis not healthy');
        return 0;
      }

      const keys = await client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await client.del(keys);
      return result;
    } catch (error) {
      logger.error(error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param key - Cache key
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = redisClientManager.getClient();
      if (!client || !redisClientManager.isHealthy()) {
        logger.debug('Cache exists skipped - Redis not healthy');
        return false;
      }

      const result = await client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ hitRate: number; memoryUsage: string } | null> {
    try {
      const client = redisClientManager.getClient();
      if (!client || !redisClientManager.isHealthy()) {
        return null;
      }

      const info = await client.info('stats');
      const memory = await client.info('memory');

      // Parse info response
      const statsLines = info.split('\r\n');
      const memoryLines = memory.split('\r\n');

      let hits = 0,
        misses = 0,
        usedMemory = 'N/A';

      for (const line of statsLines) {
        if (line.startsWith('keyspace_hits:')) {
          hits = parseInt(line.split(':')[1], 10);
        }
        if (line.startsWith('keyspace_misses:')) {
          misses = parseInt(line.split(':')[1], 10);
        }
      }

      for (const line of memoryLines) {
        if (line.startsWith('used_memory_human:')) {
          usedMemory = line.split(':')[1];
        }
      }

      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      return {
        hitRate: Math.round(hitRate * 100) / 100,
        memoryUsage: usedMemory,
      };
    } catch (error) {
      logger.error('Cache getStats error:', error);
      return null;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async flushAll(): Promise<boolean> {
    try {
      const client = redisClientManager.getClient();
      if (!client || !redisClientManager.isHealthy()) {
        logger.debug('Cache flushAll skipped - Redis not healthy');
        return false;
      }

      await client.flushAll();
      logger.warn('Cache flushed - all keys deleted');
      return true;
    } catch (error) {
      logger.error('Cache flushAll error:', error);
      return false;
    }
  }

  /**
   * Get or set pattern - useful for lazy loading
   * @param key - Cache key
   * @param fallback - Function to call if cache miss
   * @param ttlSeconds - Time to live in seconds
   */
  async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T | null> {
    try {
      // Try to get from cache
      const cached = await this.get<T>(key);
      if (cached !== null) {
        logger.debug(`Cache hit for key ${key}`);
        return cached;
      }

      // Cache miss - call fallback
      logger.debug(`Cache miss for key ${key}`);
      const value = await fallback();

      // Set in cache
      if (value !== null) {
        await this.set(key, value, ttlSeconds);
      }

      return value;
    } catch (error) {
      logger.error(`Cache getOrSet error for key ${key}:`, error);
      // Return null on error to allow graceful degradation
      return null;
    }
  }

  /**
   * Increment a counter in cache
   * @param key - Cache key
   * @param increment - Amount to increment (default 1)
   */
  async increment(key: string, increment: number = 1): Promise<number | null> {
    try {
      const client = redisClientManager.getClient();
      if (!client || !redisClientManager.isHealthy()) {
        logger.debug('Cache increment skipped - Redis not healthy');
        return null;
      }

      const result = await client.incrBy(key, increment);
      return result;
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Decrement a counter in cache
   * @param key - Cache key
   * @param decrement - Amount to decrement (default 1)
   */
  async decrement(key: string, decrement: number = 1): Promise<number | null> {
    try {
      const client = redisClientManager.getClient();
      if (!client || !redisClientManager.isHealthy()) {
        logger.debug('Cache decrement skipped - Redis not healthy');
        return null;
      }

      const result = await client.decrBy(key, decrement);
      return result;
    } catch (error) {
      logger.error(`Cache decrement error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Add element to a set
   * @param key - Cache key
   * @param members - Members to add
   */
  async addToSet(key: string, ...members: string[]): Promise<number | null> {
    try {
      const client = redisClientManager.getClient();
      if (!client || !redisClientManager.isHealthy()) {
        logger.debug('Cache addToSet skipped - Redis not healthy');
        return null;
      }

      const result = await client.sAdd(key, members);
      return result;
    } catch (error) {
      logger.error(`Cache addToSet error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get all members of a set
   * @param key - Cache key
   */
  async getSet(key: string): Promise<string[] | null> {
    try {
      const client = redisClientManager.getClient();
      if (!client || !redisClientManager.isHealthy()) {
        logger.debug('Cache getSet skipped - Redis not healthy');
        return null;
      }

      const result = await client.sMembers(key);
      return result;
    } catch (error) {
      logger.error(`Cache getSet error for key ${key}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

export default cacheService;
