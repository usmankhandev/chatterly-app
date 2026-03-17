# 🚀 Chatterly Backend - Quick Reference

## 📁 Project Structure

**Root:** Clean directory for client code (Angular, React, Vue)
**Server:** All backend code, config, and docs in `./server`

## ⚡ Quick Commands

### Start Backend

```bash
cd server/
docker compose up -d
```

### Check Status

```bash
docker compose ps                    # Container status
curl http://localhost:3001/health    # Health check
curl http://localhost:3001/ready     # Readiness probe
```

### View Logs

```bash
docker compose logs -f               # All services
docker compose logs server -f        # Server only
docker compose logs postgres -f      # Database only
docker compose logs redis -f         # Cache only
```

### Stop Backend

```bash
docker compose down                  # Stop all containers
docker compose down -v               # Stop + remove data
```

## 🧪 Testing

```bash
cd server/
npm run test              # Run all tests
npm run test:coverage     # With coverage report
npm run test:watch       # Watch mode
```

## 📝 Environment Setup

```bash
cd server/
cp .env.redis.example .env.local
# Edit .env.local with your settings
```

## 🔧 Development (Local without Docker)

```bash
cd server/

# Terminal 1: Run DB & Cache only
docker compose up -d postgres redis

# Terminal 2: Run server locally
npm install
npm run dev
```

## 🗄️ Database Operations

```bash
cd server/

# View data visually
npx prisma studio

# Create migration
npx prisma migrate dev --name <description>

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only!)
npx prisma migrate reset

# Access database CLI
docker compose exec postgres psql -U postgres -d chatterly
```

## 📊 Redis Operations

```bash
cd server/

# Access Redis CLI
docker compose exec redis redis-cli

# Common Redis commands:
# PING                  # Test connection
# KEYS *               # All keys
# GET key              # Get value
# DEL key              # Delete key
# FLUSHALL             # Clear all data
# INFO memory          # Memory stats
```

## 🏗️ Service Integration Pattern

When adding caching to a service:

```typescript
import { CacheService } from './cache.service';

export class MyService {
  private cache = new CacheService();

  async getData(id: string) {
    // Try cache first
    const cached = await this.cache.get(`data:${id}`);
    if (cached) return cached;

    // Get from database
    const data = await this.database.fetch(id);

    // Store in cache (30 min TTL)
    await this.cache.set(`data:${id}`, data, 1800);

    return data;
  }

  // Invalidate on update
  async updateData(id: string, updates: any) {
    const result = await this.database.update(id, updates);
    await this.cache.delete(`data:${id}`);
    return result;
  }
}
```

## 📚 Documentation Files

| File                                  | Content                   |
| ------------------------------------- | ------------------------- |
| `SETUP_INSTRUCTIONS.md`               | Complete setup guide      |
| `REDIS_CACHING_GUIDE.md`              | Redis architecture        |
| `CACHING_INTEGRATION_GUIDE.md`        | 9 integration templates   |
| `REDIS_QUICKSTART.md`                 | Redis quick reference     |
| `PHASE_1_1_IMPLEMENTATION_SUMMARY.md` | What was implemented      |
| `PHASE_1_IMPLEMENTATION_STATUS.md`    | 10-phase roadmap          |
| `NOTIFICATION_SERVICE_REFACTOR.md`    | Notification improvements |
| `PROJECT_REORGANIZATION_SUMMARY.md`   | This reorganization       |

## 🔌 API Endpoints

### Health & Status

- `GET /health` - Service health (DB + Cache status)
- `GET /ready` - Readiness probe (K8s)

### Authentication

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token

### Posts

- `GET /api/posts` - Get feed
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Comments

- `GET /api/posts/:id/comments` - Get comments
- `POST /api/posts/:id/comments` - Add comment
- `DELETE /api/comments/:id` - Delete comment

### Likes

- `POST /api/posts/:id/like` - Like post
- `DELETE /api/posts/:id/like` - Unlike post
- `POST /api/comments/:id/like` - Like comment
- `DELETE /api/comments/:id/like` - Unlike comment

### Friends

- `GET /api/friends` - Get friends list
- `POST /api/friends/:id` - Add friend
- `DELETE /api/friends/:id` - Remove friend
- `GET /api/friends/:id/requests` - Friend requests

### Notifications

- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

## 🔄 Cache Keys Pattern

```
user:{userId}                 # User profile
user:{userId}:friends         # Friends list
user:{userId}:stats           # User statistics
post:{postId}                 # Post details
post:{postId}:comments        # Post comments
post:{postId}:likes           # Post likes
feed:{userId}                 # User feed
notification:{userId}         # User notifications
```

## ⚙️ Configuration

### Database

- **Host:** localhost (port 5433) or postgres (Docker)
- **User:** postgres
- **Password:** postgres
- **Database:** chatterly

### Redis

- **Host:** localhost:6379 (or redis:6379 in Docker)
- **Database:** 0
- **Max Memory:** 512MB with LRU eviction

### Server

- **Port:** 3001
- **Environment:** development (can be changed)
- **Node Version:** 18+

## 🐛 Common Issues

### Port Already in Use

```bash
# Find process
lsof -i :PORT

# Kill it
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check if running
docker compose ps postgres

# View logs
docker compose logs postgres

# Reconnect
docker compose restart postgres
```

### Redis Connection Failed

```bash
# Check if running
docker compose ps redis

# Test connection
docker compose exec redis redis-cli ping

# Restart
docker compose restart redis
```

### Code Changes Not Reflecting

```bash
# Rebuild image
docker compose up -d --build server

# Or restart
docker compose restart server
```

## 📈 Next Steps

### Phase 1.2 - Rate Limiting (5-10 days)

- Install `rate-limiter-flexible`
- Create middleware
- Apply per-route limits

### Phase 2 - Message Queue (10-15 days)

- Implement Bull/RabbitMQ
- Queue email/SMS
- Async processing

### Phase 3 - Search (10-15 days)

- Elasticsearch integration
- Full-text search
- Advanced filtering

See `PHASE_1_IMPLEMENTATION_STATUS.md` for full roadmap.

## 🆘 Help

- **Setup Issues:** See `SETUP_INSTRUCTIONS.md` → Troubleshooting
- **Caching:** See `CACHING_INTEGRATION_GUIDE.md`
- **Redis:** See `REDIS_QUICKSTART.md`
- **Implementation:** See `PHASE_1_1_IMPLEMENTATION_SUMMARY.md`
- **Roadmap:** See `PHASE_1_IMPLEMENTATION_STATUS.md`

---

**Backend Status:** Phase 1.1 Complete ✅ | Ready for Phase 1.2 ⏭️
