import { redisClientManager } from '../../config/redisClient';
import {
 
 
 ,

  cacheService,
  CACHE_KEYS,
  CACHE_TTL,
} from '../../services/cache.service';

describe('Redis Cache Integration', () => {
  beforeAll(async () => {
    await redisClientManager.connect();
  });

  afterAll(async () => {
    await redisClientManager.disconnect();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.flushAll();
  });

  describe('Cache Service Basic Operations', () => {
    it('should set and get a value from cache', async () => {
      const key = 'test:key';
      const value = { id: '123', name: 'Test User' };

      await cacheService.set(key, value, 60);
      const retrieved = await cacheService.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const retrieved = await cacheService.get('non:existent:key');
      expect(retrieved).toBeNull();
    });

    it('should delete a key from cache', async () => {
      const key = 'test:delete';
      await cacheService.set(key, { data: 'test' }, 60);

      let exists = await cacheService.exists(key);
      expect(exists).toBe(true);

      await cacheService.delete(key);
      exists = await cacheService.exists(key);
      expect(exists).toBe(false);
    });

    it('should expire cache after TTL', async () => {
      const key = 'test:ttl';
      await cacheService.set(key, { data: 'expires' }, 1); // 1 second TTL

      let retrieved = await cacheService.get(key);
      expect(retrieved).not.toBeNull();

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      retrieved = await cacheService.get(key);
      expect(retrieved).toBeNull();
    });
  });

  describe('Cache Keys', () => {
    it('should generate correct cache keys for user profiles', () => {
      const userId = 'user-123';
      const key = CACHE_KEYS.USER_PROFILE(userId);

      expect(key).toBe('user:profile:user-123');
    });

    it('should generate correct cache keys for user friends', () => {
      const userId = 'user-456';
      const key = CACHE_KEYS.USER_FRIENDS(userId);

      expect(key).toBe('friends:user-456');
    });

    it('should generate correct cache keys for feeds', () => {
      const userId = 'user-789';
      const page = 2;
      const key = CACHE_KEYS.POST_FEED(userId, page);

      expect(key).toBe('feed:user:user-789:page:2');
    });
  });

  describe('Cache TTL Constants', () => {
    it('should have correct TTL values', () => {
      expect(CACHE_TTL.USER_PROFILE).toBe(30 * 60); // 30 minutes
      expect(CACHE_TTL.USER_SETTINGS).toBe(60 * 60); // 1 hour
      expect(CACHE_TTL.POST_FEED).toBe(5 * 60); // 5 minutes
      expect(CACHE_TTL.SHORT_LIVED).toBe(5 * 60); // 5 minutes
      expect(CACHE_TTL.MEDIUM_LIVED).toBe(30 * 60); // 30 minutes
      expect(CACHE_TTL.LONG_LIVED).toBe(60 * 60); // 1 hour
    });
  });

  describe('Cache Operations', () => {
    it('should handle getOrSet with cache hit', async () => {
      const key = 'test:getOrSet';
      const value = { data: 'cached' };

      await cacheService.set(key, value, 60);

      let callCount = 0;
      const result = await cacheService.getOrSet(
        key,
        async () => {
          callCount++;
          return { data: 'fresh' };
        },
        60,
      );

      expect(result).toEqual(value);
      expect(callCount).toBe(0); // Fallback should not be called
    });

    it('should handle getOrSet with cache miss', async () => {
      const key = 'test:getOrSet:miss';
      let callCount = 0;

      const result = await cacheService.getOrSet(
        key,
        async () => {
          callCount++;
          return { data: 'fresh' };
        },
        60,
      );

      expect(result).toEqual({ data: 'fresh' });
      expect(callCount).toBe(1); // Fallback should be called once
    });

    it('should increment counters', async () => {
      const key = 'test:counter';

      let count = await cacheService.increment(key, 1);
      expect(count).toBe(1);

      count = await cacheService.increment(key, 5);
      expect(count).toBe(6);

      count = await cacheService.decrement(key, 2);
      expect(count).toBe(4);
    });

    it('should handle set operations', async () => {
      const key = 'test:set';

      await cacheService.addToSet(key, 'member1', 'member2', 'member3');
      const members = await cacheService.getSet(key);

      expect(members).toContain('member1');
      expect(members).toContain('member2');
      expect(members).toContain('member3');
      expect(members?.length).toBe(3);
    });
  });

  describe('Pattern-based Operations', () => {
    it('should delete keys by pattern', async () => {
      const userId = 'user-pa2ttern-test';

      // Set multiple keys
      await cacheService.set(`user:profile:${userId}`, { profile: 'data' }, 60);
      await cacheService.set(
        `user:settings:${userId}`,
        { settings: 'data' },
        60,
      );
      await cacheService.set(`other:key`, { other: 'data' }, 60);
      
      // Delete by pattern
      const deletedCount = await cacheService.deleteByPattern('user:*');

      expect(deletedCount).toBeGreaterThanOrEqual(2);

      // Verify user keys are gone
      const profileExists = await cacheService.exists(`user:profile:${userId}`);
      const settingsExists = await cacheService.exists(
        `user:settings:${userId}`,
      );
      expect(profileExists).toBe(false);
      expect(settingsExists).toBe(false);

      // Verify other key still exists
      const otherExists = await cacheService.exists('other:key');
      expect(otherExists).toBe(true);
    });
  });

  describe('Health Checks', () => {
    it('should report Redis as healthy', () => {
      const isHealthy = redisClientManager.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it('should get cache statistics', async () => {
      // Perform some operations to generate stats
      await cacheService.set('stats:test1', { data: 'test' }, 60);
      await cacheService.get('stats:test1'); // Cache hit
      await cacheService.get('non:existent'); // Cache miss

      const stats = await cacheService.getStats();

      expect(stats).not.toBeNull();
      expect(stats?.hitRate).toBeDefined();
      expect(stats?.memoryUsage).toBeDefined();
    });
  });
});
