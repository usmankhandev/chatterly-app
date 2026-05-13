# Redis Caching Implementation Guide

## Overview

This document describes the Redis caching layer integrated into Chatterly's backend to improve performance and reduce database load.

## Architecture

### Components

1. **Redis Client Manager** (`src/config/redisClient.ts`)
   - Singleton instance managing Redis connections
   - Connection pooling with configurable retry logic
   - Health checks and reconnection strategies
   - Graceful shutdown handling

2. **Cache Service** (`src/services/cache.service.ts`)
   - High-level cache abstraction layer
   - Common cache operations (get, set, delete, getOrSet)
   - Pattern-based deletion
   - Counter operations (increment, decrement)
   - Set operations
   - Statistics and health monitoring

3. **User Service** (`src/services/user.service.ts`)
   - User profile fetching with automatic caching
   - Bulk user profile loading (reduces N+1 queries)
   - Cache invalidation on profile updates
   - User friends list caching
   - User search with caching
   - User statistics caching

4. **Integration Points**
   - Updated `src/index.ts` to initialize Redis on startup
   - Added health check endpoints in `src/app.ts`
   - Updated `src/services/friendship.service.ts` to invalidate caches

## Cache Keys

All cache keys follow a naming convention for organization:

```typescript
// User Profile (30 min TTL)
user:profile:{userId}

// User Settings (1 hour TTL)
user:settings:{userId}

// User Friends List (30 min TTL)
friends:{userId}

// Posts (15 min TTL)
post:{postId}

// Feed (5 min TTL)
feed:user:{userId}:page:{pageNumber}

// Comments (10 min TTL)
comments:post:{postId}

// Friendship Lists (15 min TTL)
friendships:{userId}

// User Search (5 min TTL)
search:users:{query}:{limit}

// User Statistics (30 min TTL)
user:stats:{userId}
```

## Cache TTLs (Time To Live)

| Resource        | TTL    | Reason                                 |
| --------------- | ------ | -------------------------------------- |
| User Profile    | 30 min | User data changes infrequently         |
| User Settings   | 1 hour | Settings even less frequent            |
| Post Feed       | 5 min  | Feed updates frequently with new posts |
| Comment Thread  | 10 min | Comments moderate update frequency     |
| Friendship List | 15 min | Relatively stable                      |
| User Friends    | 30 min | Stable relationship data               |
| User Search     | 5 min  | Search results may change              |
| User Stats      | 30 min | Statistics update less frequently      |

## Usage Examples

### Basic Cache Operations

```typescript
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../services/cache.service";

// Set a value
await cacheService.set("myKey", { data: "value" }, 300); // 5 minute TTL

// Get a value
const data = await cacheService.get("myKey");

// Delete a key
await cacheService.delete("myKey");

// Check if key exists
const exists = await cacheService.exists("myKey");

// Delete all keys matching pattern
await cacheService.deleteByPattern("user:*");
```

### Using getOrSet Pattern (Recommended)

```typescript
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../services/cache.service";

// This automatically caches the result if not found
const userProfile = await cacheService.getOrSet(
  CACHE_KEYS.USER_PROFILE(userId),
  async () => {
    // This function is called only on cache miss
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    });
  },
  CACHE_TTL.USER_PROFILE,
);
```

### Using User Service

```typescript
import { UserService } from "../services/user.service";
import prisma from "../config/prismaClient";

const userService = new UserService(prisma);

// Get single user profile (cached)
const profile = await userService.getUserProfile(userId);

// Get multiple profiles (bulk operation, reduces N+1 queries)
const profiles = await userService.getUserProfiles([userId1, userId2, userId3]);
profiles.forEach((profile, userId) => {
  console.log(`User ${userId}:`, profile);
});

// Get user with settings
const userWithSettings = await userService.getUserProfileWithSettings(userId);

// Update profile and invalidate cache
await userService.updateUserProfile(userId, {
  firstname: "John",
  lastname: "Doe",
  bio: "Updated bio",
});

// Get user's friends list
const friends = await userService.getUserFriends(userId);

// Get user statistics
const stats = await userService.getUserStats(userId);
// { friendsCount, postsCount, followersCount }
```

### Counter Operations

```typescript
// Increment a counter
let count = await cacheService.increment("post:123:likes", 1);

// Get updated value
count = await cacheService.increment("post:123:likes", 1);
// count = 2

// Decrement a counter
count = await cacheService.decrement("post:123:likes", 1);
// count = 1
```

### Set Operations

```typescript
// Add members to a set
await cacheService.addToSet(
  "user:123:tags",
  "javascript",
  "typescript",
  "nodejs",
);

// Get all members of a set
const tags = await cacheService.getSet("user:123:tags");
// ['javascript', 'typescript', 'nodejs']
```

## Cache Invalidation Patterns

### Pattern 1: Invalidate on Update

```typescript
// When user profile is updated
await userService.updateUserProfile(userId, newData);
// Cache is automatically invalidated

// Or manually
await userService.invalidateUserProfileCache(userId);
```

### Pattern 2: Relationship Invalidation

```typescript
// When friendship status changes
await userService.invalidateFriendsCacheForBoth(userId1, userId2);
// Invalidates both users' friend lists
```

### Pattern 3: Cascade Invalidation

```typescript
// Delete all user-related caches
await cacheService.deleteByPattern(`user:${userId}:*`);
```

## Environment Configuration

Add these to your `.env.development`:

```env
REDIS_URL=redis://localhost:6379
CACHE_TTL_USER_PROFILE=1800      # 30 minutes
CACHE_TTL_USER_SETTINGS=3600     # 1 hour
CACHE_TTL_POST_FEED=300          # 5 minutes
LOG_LEVEL=info
```

## Docker Compose Configuration

Redis is automatically configured in `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  restart: always
  container_name: chatterly_redis
  ports:
    - "6379:6379"
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
  volumes:
    - redisdata:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**Key features:**

- Alpine image for minimal size
- Append-only file for persistence
- 512MB max memory limit
- LRU eviction policy (removes least recently used keys when limit exceeded)
- Health checks for orchestration
- Persistent storage with named volume

## Health Checks

### Application Health Endpoints

The application exposes two health check endpoints:

#### `/health` - System Health

```bash
curl http://localhost:3001/health
```

Response:

```json
{
  "status": "UP",
  "timestamp": "2024-02-14T10:30:00.000Z",
  "services": {
    "database": "UP",
    "cache": "UP"
  }
}
```

#### `/ready` - Readiness Probe

```bash
curl http://localhost:3001/ready
```

Response (ready):

```json
{
  "ready": true,
  "timestamp": "2024-02-14T10:30:00.000Z"
}
```

Response (not ready):

```json
{
  "ready": false,
  "timestamp": "2024-02-14T10:30:00.000Z",
  "reason": "Cache not ready"
}
```

## Cache Statistics

Check cache performance metrics:

```typescript
const stats = await cacheService.getStats();
// {
//   hitRate: 85.5,        // percentage
//   memoryUsage: "256MB"  // human readable
// }
```

## Monitoring

### Redis CLI Commands

```bash
# Connect to Redis
redis-cli

# Check connection
PING

# Get all keys (be careful in production)
KEYS *

# Get keys matching pattern
KEYS "user:profile:*"

# Get memory info
INFO memory

# Get stats
INFO stats

# Get all stats
INFO

# Monitor real-time commands
MONITOR

# Delete a key
DEL key_name

# Flush all keys (DANGER - development only)
FLUSHALL
```

### Docker Commands

```bash
# Access Redis container
docker exec -it chatterly_redis redis-cli

# View Redis logs
docker logs chatterly_redis

# Check Redis memory usage
docker stats chatterly_redis
```

## Performance Impact

### Expected Benefits

- **Database Query Reduction**: 80-90% reduction in user profile queries
- **Response Time**: 50-100x faster for cached data
- **API Latency**: Reduced from 100-500ms to 5-20ms for cached endpoints
- **Database Load**: Significant reduction during peak hours

### Cache Hit Rate Targets

- **User Profiles**: 85-95% hit rate
- **User Friends**: 80-90% hit rate
- **Posts/Feeds**: 70-85% hit rate (lower due to frequent updates)
- **Overall Target**: 80%+ combined hit rate

## Error Handling

Cache operations are resilient:

```typescript
// If Redis is down or returns null, getOrSet falls back to database
const data = await cacheService.getOrSet(key, fallbackFunction, ttl);
// Returns null if both cache and fallback fail

// Health status can be checked
if (redisClientManager.isHealthy()) {
  console.log("Cache is available");
} else {
  console.log("Cache is unavailable, using database");
}
```

## Testing

Run cache tests:

```bash
npm run test:unit -- cache.service.test.ts
```

Tests cover:

- Basic cache operations (set, get, delete)
- TTL expiration
- getOrSet pattern
- Pattern-based deletion
- Counter operations
- Set operations
- Health checks
- Statistics

## Best Practices

### DO ✅

1. **Use getOrSet** for automatic caching with fallback
2. **Invalidate strategically** - only when data changes
3. **Use appropriate TTLs** - balance between freshness and performance
4. **Monitor hit rates** - adjust TTLs based on performance
5. **Handle gracefully** - assume cache might be down
6. **Bulk operations** - use `getUserProfiles` for multiple users
7. **Pattern-based deletion** - efficiently clear related caches

### DON'T ❌

1. **Don't cache** user passwords, sensitive tokens, or PII unnecessarily
2. **Don't set very short TTLs** - defeats the purpose (use 5+ minutes)
3. **Don't cache transactional data** - data that needs strong consistency
4. **Don't forget to invalidate** - stale data is worse than no cache
5. **Don't rely entirely on cache** - always have database fallback
6. **Don't cache errors** - allow retry mechanisms to work
7. **Don't cache all responses** - be selective

## Future Enhancements

1. **Cache Warming**: Pre-load frequently accessed data on startup
2. **Cache Layers**: Implement multi-tier caching (local + Redis)
3. **Distributed Caching**: Redis cluster for high availability
4. **Cache Tagging**: Group related cache keys for bulk invalidation
5. **Cache Metrics**: Detailed prometheus metrics for monitoring
6. **Pub/Sub Integration**: Real-time cache invalidation across services
7. **Cache Compression**: Compress large objects to save memory

## Troubleshooting

### Cache Not Working

1. Check Redis is running: `docker ps | grep redis`
2. Check connection string: `echo $REDIS_URL`
3. Check health: `curl http://localhost:3001/health`
4. Check logs: `docker logs chatterly_redis`

### High Memory Usage

1. Check LRU policy is enabled
2. Lower TTLs for frequently cached data
3. Clear unnecessary cache: `FLUSHALL`
4. Monitor with: `redis-cli INFO memory`

### Cache Inconsistencies

1. Verify invalidation is called on updates
2. Check TTL values are appropriate
3. Review cache key generation logic
4. Use pattern deletion if needed

## References

- [Redis Documentation](https://redis.io/documentation)
- [Node Redis Client](https://github.com/redis/node-redis)
- [Cache Patterns](https://www.redis.com/blog/cache-patterns/)
- [TTL Best Practices](https://redis.io/docs/manage/persistence/)
