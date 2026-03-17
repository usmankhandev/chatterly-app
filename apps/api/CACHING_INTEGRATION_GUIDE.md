# Integration Guide: Adding Caching to Existing Services

This guide shows how to integrate the Redis caching layer into your existing services step by step.

## Template 1: Simple GET Operation with Caching

### Before (Without Cache)

```typescript
async getPost(postId: string): Promise<Post> {
  const post = await this.prisma.post.findUnique({
    where: { id: postId }
  });
  return post;
}
```

### After (With Cache)

```typescript
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../services/cache.service';

async getPost(postId: string): Promise<Post | null> {
  // Try cache first
  const cached = await cacheService.get(CACHE_KEYS.POST(postId));
  if (cached) return cached;

  // Cache miss - fetch from database
  const post = await this.prisma.post.findUnique({
    where: { id: postId }
  });

  // Cache the result
  if (post) {
    await cacheService.set(
      CACHE_KEYS.POST(postId),
      post,
      CACHE_TTL.POST
    );
  }

  return post || null;
}
```

### Simplified (Using getOrSet)

```typescript
async getPost(postId: string): Promise<Post | null> {
  return cacheService.getOrSet(
    CACHE_KEYS.POST(postId),
    () => this.prisma.post.findUnique({ where: { id: postId } }),
    CACHE_TTL.POST
  );
}
```

---

## Template 2: CRUD with Cache Invalidation

### Create with Cache

```typescript
async createPost(data: CreatePostInput, userId: string): Promise<Post> {
  const post = await this.prisma.post.create({
    data: {
      ...data,
      authorId: userId
    }
  });

  // Cache the new post
  await cacheService.set(
    CACHE_KEYS.POST(post.id),
    post,
    CACHE_TTL.POST
  );

  // Invalidate user's feed cache
  await cacheService.deleteByPattern(`feed:user:${userId}:*`);

  return post;
}
```

### Update with Cache Invalidation

```typescript
async updatePost(postId: string, data: UpdatePostInput): Promise<Post> {
  const post = await this.prisma.post.update({
    where: { id: postId },
    data
  });

  // Invalidate cache
  await cacheService.delete(CACHE_KEYS.POST(postId));

  // Invalidate related feed caches
  await cacheService.deleteByPattern('feed:user:*');

  return post;
}
```

### Delete with Cache Cleanup

```typescript
async deletePost(postId: string): Promise<void> {
  await this.prisma.post.delete({
    where: { id: postId }
  });

  // Clear post cache
  await cacheService.delete(CACHE_KEYS.POST(postId));

  // Clear all feed caches
  await cacheService.deleteByPattern('feed:user:*');
}
```

---

## Template 3: List Operations with Pagination Cache

### Without Cache

```typescript
async getPostsByUser(userId: string, page: number = 1): Promise<Post[]> {
  const limit = 10;
  const skip = (page - 1) * limit;

  return this.prisma.post.findMany({
    where: { authorId: userId },
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' }
  });
}
```

### With Cache

```typescript
async getPostsByUser(userId: string, page: number = 1): Promise<Post[]> {
  const cacheKey = CACHE_KEYS.POST_FEED(userId, page);

  return (
    (await cacheService.getOrSet(
      cacheKey,
      async () => {
        const limit = 10;
        const skip = (page - 1) * limit;

        return this.prisma.post.findMany({
          where: { authorId: userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
      },
      CACHE_TTL.POST_FEED
    )) || []
  );
}
```

---

## Template 4: Bulk Operations (Prevent N+1)

### Without Cache (N+1 Problem)

```typescript
async getPostsWithAuthors(postIds: string[]): Promise<PostWithAuthor[]> {
  const posts = await this.prisma.post.findMany({
    where: { id: { in: postIds } },
    include: { author: true } // ❌ N+1 if author not cached
  });

  return posts;
}
```

### With Cache (Optimized)

```typescript
async getPostsWithAuthors(postIds: string[]): Promise<PostWithAuthor[]> {
  // Get all posts
  const posts = await this.prisma.post.findMany({
    where: { id: { in: postIds } }
  });

  // Get author IDs
  const authorIds = [...new Set(posts.map(p => p.authorId))];

  // Bulk load authors with cache
  const userService = new UserService(this.prisma);
  const authorMap = await userService.getUserProfiles(authorIds);

  // Combine results
  return posts.map(post => ({
    ...post,
    author: authorMap.get(post.authorId)
  }));
}
```

---

## Template 5: Counting with Counters

### View Count Example

```typescript
async viewPost(postId: string): Promise<void> {
  const viewKey = `post:${postId}:views`;

  // Increment view counter
  const viewCount = await cacheService.increment(viewKey, 1);

  // Optionally persist to database every N views
  if (viewCount && viewCount % 100 === 0) {
    await this.prisma.post.update({
      where: { id: postId },
      data: { views: viewCount }
    });
  }
}

async getViewCount(postId: string): Promise<number> {
  const viewKey = `post:${postId}:views`;
  const count = await cacheService.get<number>(viewKey) || 0;
  return count;
}
```

---

## Template 6: Search Cache

### Search Caching

```typescript
async searchUsers(query: string, limit: number = 10): Promise<User[]> {
  const cacheKey = `search:users:${query}:${limit}`;

  return (
    (await cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { firstname: { contains: query, mode: 'insensitive' } },
              { lastname: { contains: query, mode: 'insensitive' } }
            ]
          },
          take: limit
        });
      },
      CACHE_TTL.SHORT_LIVED // 5 minutes for search results
    )) || []
  );
}
```

---

## Template 7: Relationship Cache

### Friends List Cache

```typescript
async getFriendsList(userId: string): Promise<User[]> {
  return (
    (await cacheService.getOrSet(
      CACHE_KEYS.USER_FRIENDS(userId),
      async () => {
        const friendships = await this.prisma.friendship.findMany({
          where: {
            OR: [
              { requesterId: userId, status: 'ACCEPTED' },
              { receiverId: userId, status: 'ACCEPTED' }
            ]
          },
          include: { requester: true, receiver: true }
        });

        // Extract friend objects
        return friendships.map(f =>
          f.requesterId === userId ? f.receiver : f.requester
        );
      },
      CACHE_TTL.USER_FRIENDS
    )) || []
  );
}

// Invalidate when friendship changes
async updateFriendship(userId1: string, userId2: string): Promise<void> {
  // ... update logic ...

  // Clear both users' friend caches
  await Promise.all([
    cacheService.delete(CACHE_KEYS.USER_FRIENDS(userId1)),
    cacheService.delete(CACHE_KEYS.USER_FRIENDS(userId2))
  ]);
}
```

---

## Template 8: Cache Warming on Startup

### Preload Popular Data

```typescript
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../services/cache.service";

export async function warmCache(): Promise<void> {
  console.log("🔥 Warming cache...");

  try {
    // Get top users
    const topUsers = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    for (const user of topUsers) {
      const cacheKey = CACHE_KEYS.USER_PROFILE(user.id);
      await cacheService.set(cacheKey, user, CACHE_TTL.USER_PROFILE);
    }

    console.log(`✅ Cached ${topUsers.length} top users`);

    // Get popular posts
    const popularPosts = await this.prisma.post.findMany({
      orderBy: { likes: { _count: "desc" } },
      take: 50,
      include: { _count: { select: { likes: true } } },
    });

    for (const post of popularPosts) {
      const cacheKey = CACHE_KEYS.POST(post.id);
      await cacheService.set(cacheKey, post, CACHE_TTL.POST);
    }

    console.log(`✅ Cached ${popularPosts.length} popular posts`);
  } catch (error) {
    console.error("❌ Cache warming failed:", error);
  }
}

// Call during server initialization
// In src/index.ts after Redis connects
await warmCache();
```

---

## Template 9: Error Handling & Fallback

### Graceful Degradation

```typescript
async getDataWithFallback<T>(
  cacheKey: string,
  dbFetch: () => Promise<T>,
  ttl: number
): Promise<T | null> {
  try {
    // Try cache first
    return await cacheService.getOrSet(cacheKey, dbFetch, ttl);
  } catch (error) {
    console.error(`Cache error for ${cacheKey}:`, error);

    // Try database as fallback
    try {
      return await dbFetch();
    } catch (dbError) {
      console.error(`Database error for ${cacheKey}:`, dbError);
      return null; // Return null if both fail
    }
  }
}
```

---

## Integration Checklist

When adding caching to a service:

- [ ] Import `cacheService`, `CACHE_KEYS`, `CACHE_TTL`
- [ ] Identify which operations to cache (reads > writes)
- [ ] Choose appropriate TTL based on data freshness needs
- [ ] Define cache keys using `CACHE_KEYS` constants
- [ ] Implement cache invalidation on writes
- [ ] Handle cache miss scenario (fallback to DB)
- [ ] Test cache hit/miss scenarios
- [ ] Monitor cache hit rates
- [ ] Document cache behavior in service

---

## Performance Tips

1. **Cache frequently accessed data** - User profiles, popular posts
2. **Don't cache transactional data** - Payment info, sensitive data
3. **Use appropriate TTLs** - Balance freshness vs performance
4. **Invalidate strategically** - Only when data actually changes
5. **Monitor hit rates** - Aim for 80%+ overall hit rate
6. **Bulk operations** - Use `getUserProfiles()` instead of loops
7. **Pattern deletion** - Efficiently clear related caches

---

## See Also

- [REDIS_CACHING_GUIDE.md](./REDIS_CACHING_GUIDE.md) - Complete documentation
- [PHASE_1_1_IMPLEMENTATION_SUMMARY.md](./PHASE_1_1_IMPLEMENTATION_SUMMARY.md) - Implementation details
- [src/services/user.service.ts](./server/src/services/user.service.ts) - Real-world example
