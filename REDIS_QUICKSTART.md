# Redis Caching - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Start the Containers

```bash
cd /home/usmankhandev/senior-fullstack-dev/angular-projects/chatterly
docker compose up -d
```

### Step 2: Verify Redis is Running

```bash
docker exec chatterly_redis redis-cli ping
# Output: PONG ✅
```

### Step 3: Check Health Endpoints

```bash
# System health
curl http://localhost:3001/health

# Readiness
curl http://localhost:3001/ready
```

---

## 📚 Core Concepts in 60 Seconds

### What is Redis?

Fast in-memory database perfect for caching frequently accessed data.

### Why Use It?

- ⚡ 50-100x faster than database
- 💾 Reduces database load by 80-90%
- 🔄 Automatic expiration with TTL
- 📈 Scales to millions of requests

### How It Works

```
Request for User
    ↓
Check Redis Cache
    ↓
Cache Hit? → Return cached data ⚡
    ↓ No
Query Database
    ↓
Store in Redis
    ↓
Return data
```

---

## 💻 Using the Cache Service

### Import the Service

```typescript
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../services/cache.service";
```

### Basic Operations

#### Get Data from Cache

```typescript
const userData = await cacheService.get("user:123");
```

#### Set Data in Cache (30 min TTL)

```typescript
await cacheService.set("user:123", userData, 1800);
```

#### Use getOrSet (Recommended)

```typescript
// Automatically fetches from DB if not in cache
const user = await cacheService.getOrSet(
  "user:123",
  () => db.user.findOne({ id: "123" }),
  1800,
);
```

#### Delete Cache

```typescript
await cacheService.delete("user:123");
```

---

## 👤 Using the User Service

### Get User Profile (Auto-Cached)

```typescript
const userService = new UserService(prisma);
const profile = await userService.getUserProfile("user-id");
```

### Get Multiple Users (Prevents N+1)

```typescript
const profiles = await userService.getUserProfiles([
  "user-1",
  "user-2",
  "user-3",
]);

profiles.forEach((profile, userId) => {
  console.log(profile?.username);
});
```

### Update Profile (Auto-Invalidates Cache)

```typescript
await userService.updateUserProfile("user-id", {
  firstname: "John",
  bio: "New bio",
});
```

### Get Friends List (Cached)

```typescript
const friends = await userService.getUserFriends("user-id");
```

---

## 🔄 Cache Invalidation Examples

### When User Updates

```typescript
// Cache is automatically invalidated
await userService.updateUserProfile(userId, newData);
```

### When Friendship Changes

```typescript
// Both users' friend caches are cleared
await userService.invalidateFriendsCacheForBoth(userId1, userId2);
```

### Delete Specific Cache

```typescript
await cacheService.delete(CACHE_KEYS.USER_PROFILE(userId));
```

### Delete by Pattern

```typescript
// Clear all feed caches
await cacheService.deleteByPattern("feed:user:*");
```

---

## 📊 Monitoring

### Check Cache Stats

```typescript
const stats = await cacheService.getStats();
console.log(`Hit Rate: ${stats.hitRate}%`);
console.log(`Memory: ${stats.memoryUsage}`);
```

### Monitor via Docker

```bash
# Check Redis memory
docker exec chatterly_redis redis-cli INFO memory

# View all cached keys
docker exec chatterly_redis redis-cli KEYS "*"

# Check specific key
docker exec chatterly_redis redis-cli GET "user:profile:123"
```

---

## ✅ Common Tasks

### Cache User Search Results

```typescript
await cacheService.set(
  `search:users:${query}`,
  results,
  CACHE_TTL.SHORT_LIVED, // 5 minutes
);
```

### Count View Increments

```typescript
// Increment view counter
await cacheService.increment("post:123:views", 1);

// Get current count
const count = await cacheService.get("post:123:views");
```

### Cache Friends Set

```typescript
await cacheService.addToSet("user:123:friends", "user-a", "user-b", "user-c");
const friends = await cacheService.getSet("user:123:friends");
```

---

## 🆘 Troubleshooting

### Redis Not Connecting?

```bash
# Check if running
docker ps | grep redis

# Check logs
docker logs chatterly_redis

# Test connection
docker exec chatterly_redis redis-cli ping
```

### Cache Not Working?

```bash
# Check if Redis is healthy
curl http://localhost:3001/health

# View cached keys
docker exec chatterly_redis redis-cli KEYS "*"

# Clear all cache (development only)
docker exec chatterly_redis redis-cli FLUSHALL
```

### Memory Full?

Redis has 512MB limit with LRU eviction. If hitting it:

```bash
# Check memory usage
docker exec chatterly_redis redis-cli INFO memory

# View keys
docker exec chatterly_redis redis-cli KEYS "*" | wc -l

# Clear specific pattern
docker exec chatterly_redis redis-cli KEYS "pattern:*" | \
  xargs docker exec -i chatterly_redis redis-cli DEL
```

---

## 📈 Performance Expectations

| Operation       | Time               | Improvement       |
| --------------- | ------------------ | ----------------- |
| DB Query        | 100-500ms          | Baseline          |
| Cache Hit       | 1-10ms             | 10-500x faster    |
| Overall Latency | 50-100ms → 10-20ms | 5-10x improvement |

---

## 🎯 Next Steps

1. **Run the tests**

   ```bash
   cd server
   npm run test:unit -- cache.service.test.ts
   ```

2. **Add caching to your services**
   - See [CACHING_INTEGRATION_GUIDE.md](./CACHING_INTEGRATION_GUIDE.md) for templates

3. **Monitor cache performance**
   - Check `/health` endpoint regularly
   - Monitor Redis memory usage
   - Track cache hit rates

4. **Move to Phase 1.2**
   - Implement request rate limiting
   - Add comprehensive logging

---

## 📚 Documentation

- [REDIS_CACHING_GUIDE.md](./REDIS_CACHING_GUIDE.md) - Complete reference
- [CACHING_INTEGRATION_GUIDE.md](./CACHING_INTEGRATION_GUIDE.md) - Integration examples
- [PHASE_1_1_IMPLEMENTATION_SUMMARY.md](./PHASE_1_1_IMPLEMENTATION_SUMMARY.md) - Implementation details

---

## 🐛 Debug Commands

```bash
# Check server health
curl -s http://localhost:3001/health | jq .

# Check readiness
curl -s http://localhost:3001/ready | jq .

# Redis CLI access
docker exec -it chatterly_redis redis-cli

# Monitor Redis commands in real-time
docker exec chatterly_redis redis-cli MONITOR

# Get Redis statistics
docker exec chatterly_redis redis-cli INFO

# Flush development cache only
docker exec chatterly_redis redis-cli FLUSHDB
```

---

## ⚡ Performance Tuning

### For High Traffic

- Increase Redis memory: Change `512mb` in docker-compose.yml
- Adjust TTLs: Longer TTLs = better hit rates
- Use bulk operations: `getUserProfiles()` instead of loops
- Monitor hit rates: Aim for 80%+

### For High Memory

- Reduce TTLs: Shorter expiration = less memory
- Clear unused cache: Delete old patterns
- Monitor with: `redis-cli INFO memory`
- Set memory policy: Already configured to LRU

---

**Ready to implement caching? Start with the user service templates!**

👉 See [CACHING_INTEGRATION_GUIDE.md](./CACHING_INTEGRATION_GUIDE.md) for step-by-step examples.
