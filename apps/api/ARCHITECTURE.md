# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Chatterly Backend System                     │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                      Client Layer (Future)                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │    Web Client    │  │  Mobile Client   │  │  Desktop Client  │ │
│  │   (Angular)      │  │    (React)       │  │     (Electron)   │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│           │                     │                     │            │
│           └─────────────────────┼─────────────────────┘            │
│                                 │                                  │
│                          HTTP/WebSocket                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   API Gateway / Server     │
                    │     :3001                  │
                    └─────────────┬──────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
   ┌─────────┐            ┌──────────────┐         ┌──────────────┐
   │ Express │            │   Socket.io  │         │  Middleware  │
   │   App   │            │   Realtime   │         │              │
   │ :3001   │            │   Events     │         │  - Auth      │
   └────┬────┘            └──────┬───────┘         │  - Logging   │
        │                        │                 │  - Error     │
        │    ┌───────────────────┼────────────────┐│  Handler     │
        │    │                   │                ││              │
        ▼    ▼                   ▼                ▼└──────────────┘
   ┌─────────────────────────────────────────────────┐
   │            Service Layer                        │
   │ ┌──────────────┐  ┌──────────────────────────┐ │
   │ │ Auth Service │  │ Post Service             │ │
   │ ├──────────────┤  ├──────────────────────────┤ │
   │ │ - Register   │  │ - Create Post            │ │
   │ │ - Login      │  │ - Get Feed               │ │
   │ │ - Logout     │  │ - Update Post            │ │
   │ │ - JWT        │  │ - Delete Post            │ │
   │ │ - MFA        │  │ - Search Posts           │ │
   │ └──────────────┘  └──────────────────────────┘ │
   │ ┌──────────────┐  ┌──────────────────────────┐ │
   │ │Comment Service│ │ Like Service             │ │
   │ ├──────────────┤  ├──────────────────────────┤ │
   │ │ - Create     │  │ - Like Post              │ │
   │ │ - Update     │  │ - Unlike Post            │ │
   │ │ - Delete     │  │ - Like Comment           │ │
   │ │ - Get Tree   │  │ - Unlike Comment         │ │
   │ └──────────────┘  └──────────────────────────┘ │
   │ ┌──────────────┐  ┌──────────────────────────┐ │
   │ │Friendship Srv │ │Notification Service      │ │
   │ ├──────────────┤  ├──────────────────────────┤ │
   │ │ - Add Friend │  │ - Create Notification    │ │
   │ │ - Remove     │  │ - Send Email             │ │
   │ │ - List       │  │ - Send SMS               │ │
   │ │ - Stats      │  │ - Mark Read              │ │
   │ └──────────────┘  └──────────────────────────┘ │
   │ ┌──────────────────────────────────────────────┐│
   │ │ Cache Service (12 operations)                ││
   │ │ - get, set, delete, getOrSet, TTL            ││
   │ │ - increment, decrement, bulk operations     ││
   │ └──────────────────────────────────────────────┘│
   │ ┌──────────────────────────────────────────────┐│
   │ │ Other Services                               ││
   │ │ - Email Service, SMS Service, Presence       ││
   │ │ - Feed Service, User Service                 ││
   │ └──────────────────────────────────────────────┘│
   └─────────────────────────────────────────────────┘
        │                    │                    │
        │                    │                    │
        ▼                    ▼                    ▼
   ┌──────────┐      ┌──────────────┐      ┌──────────────┐
   │ Prisma   │      │ Cache Service│      │Error Handler │
   │ ORM      │      │  (Redis)     │      │  & Logger    │
   └────┬─────┘      └──────┬───────┘      └──────────────┘
        │                   │
        │    ┌──────────────┘
        │    │
        ▼    ▼
   ┌──────────────────────────────────┐
   │    Data Persistence Layer        │
   │  ┌────────────────────────────┐  │
   │  │   PostgreSQL Database      │  │
   │  │   :5433                    │  │
   │  │  ┌──────────────────────┐  │  │
   │  │  │ Tables:              │  │  │
   │  │  │ - users              │  │  │
   │  │  │ - posts              │  │  │
   │  │  │ - comments           │  │  │
   │  │  │ - likes              │  │  │
   │  │  │ - friendships        │  │  │
   │  │  │ - notifications      │  │  │
   │  │  │ - presence           │  │  │
   │  │  │ - messages (future)  │  │  │
   │  │  └──────────────────────┘  │  │
   │  └────────────────────────────┘  │
   │  ┌────────────────────────────┐  │
   │  │   Redis Cache              │  │
   │  │   :6379                    │  │
   │  │  ┌──────────────────────┐  │  │
   │  │  │ Cache Keys:          │  │  │
   │  │  │ - user:{id}          │  │  │
   │  │  │ - user:{id}:friends  │  │  │
   │  │  │ - post:{id}          │  │  │
   │  │  │ - feed:{id}          │  │  │
   │  │  │ - notifications:{id} │  │  │
   │  │  └──────────────────────┘  │  │
   │  │  TTL: 5min - 1hour         │  │
   │  │  Max Memory: 512MB (LRU)   │  │
   │  └────────────────────────────┘  │
   └──────────────────────────────────┘
```

## Data Flow Examples

### User Registration Flow

```
Client
   │
   ├─→ POST /api/auth/register
   │
   ▼
Auth Middleware (validate input)
   │
   ▼
Auth Controller
   │
   ▼
Auth Service
   │
   ├─→ Hash password
   ├─→ Create user (Prisma)
   │
   ▼
PostgreSQL (insert user)
   │
   ▼
Send confirmation email
   │
   ├─→ Email Service
   │
   ▼
Response to Client
```

### Get User Profile Flow (with Caching)

```
Client
   │
   ├─→ GET /api/users/123
   │
   ▼
User Controller
   │
   ▼
User Service
   │
   ├─→ Check Redis cache key "user:123"
   │
   ├─→ Cache HIT? ✓
   │   └─→ Return cached data
   │
   ├─→ Cache MISS? ✗
   │   ├─→ Query PostgreSQL
   │   ├─→ Store in Redis (TTL: 30min)
   │   └─→ Return data
   │
   ▼
Response to Client
```

### Create Post Flow

```
Client
   │
   ├─→ POST /api/posts
   │
   ▼
Auth Middleware (verify JWT)
   │
   ▼
Post Controller
   │
   ▼
Post Service
   │
   ├─→ Validate input
   ├─→ Create post (Prisma)
   ├─→ Insert into PostgreSQL
   │
   ▼
Post Controller
   │
   ├─→ Invalidate cache: "feed:{userId}"
   ├─→ Publish WebSocket event (Socket.io)
   ├─→ Queue notification (future: Bull)
   │
   ▼
Response + Broadcasting to followers
```

### Like Post Flow

```
Client
   │
   ├─→ POST /api/posts/456/like
   │
   ▼
Auth Middleware (verify JWT)
   │
   ▼
Like Controller
   │
   ▼
Like Service
   │
   ├─→ Create like record
   ├─→ Update post stats
   ├─→ Cache increment: "post:456:likes"
   ├─→ Invalidate: "post:456"
   │
   ▼
Notification Service
   │
   ├─→ Create notification for post author
   ├─→ Send Email/SMS (async)
   ├─→ Broadcast via WebSocket
   │
   ▼
Response to Client
```

## Docker Compose Architecture

```
┌──────────────────────────────────────────────────┐
│         Docker Compose Network                   │
│         (bridge: chatterly_default)              │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │  PostgreSQL      │  │   Redis Cache        │ │
│  │  ─────────────   │  │   ─────────────      │ │
│  │  Host: postgres  │  │  Host: redis         │ │
│  │  Port: 5432      │  │  Port: 6379          │ │
│  │  Exposed: 5433   │  │  Exposed: 6379       │ │
│  │                  │  │                      │ │
│  │  Volume:         │  │  Volume:             │ │
│  │  pgdata          │  │  redisdata           │ │
│  └────────┬─────────┘  └──────────┬───────────┘ │
│           │                       │              │
│           └───────────┬───────────┘              │
│                       │                         │
│                       ▼                         │
│            ┌──────────────────────┐             │
│            │  Node.js Server      │             │
│            │  ──────────────────  │             │
│            │  Host: server        │             │
│            │  Port: 3001          │             │
│            │  Exposed: 3001       │             │
│            │                      │             │
│            │  Connections:        │             │
│            │  DATABASE_URL:       │             │
│            │  postgres://postgres:│             │
│            │  postgres@postgres   │             │
│            │  :5432/chatterly     │             │
│            │                      │             │
│            │  REDIS_URL:          │             │
│            │  redis://redis:6379  │             │
│            └──────────────────────┘             │
│                       ▲                         │
│                       │                         │
│         ┌─────────────┴─────────────┐           │
│         │                           │           │
│    [localhost:5433]          [localhost:6379]   │
│    [localhost:3001]                             │
│                                                 │
└──────────────────────────────────────────────────┘
         ▲
         │
         │ Network from Host Machine
         │
    ┌────┴────┐
    │ Clients │
    │ (Browser)
    └──────────┘
```

## Caching Strategy

```
┌─────────────────────────────────────────────────┐
│           Cache-Aside Pattern                   │
└─────────────────────────────────────────────────┘

Application Request
   │
   ▼
Check Cache
   │
   ├─→ Cache HIT ✓
   │  └─→ Return from Redis
   │     └─→ Update TTL
   │
   └─→ Cache MISS ✗
      └─→ Query Database
         ├─→ Store in Cache
         ├─→ Set TTL
         └─→ Return to App

TTL Strategy
────────────
SHORT_LIVED:    5 minutes   (frequently changing data)
MEDIUM_LIVED:  30 minutes   (user profiles, posts)
LONG_LIVED:     1 hour      (static data)

Cache Invalidation
──────────────────
• Manual: .delete(key)
• Pattern: .deleteByPattern("user:*")
• Cascading: Friend updates clear feed cache
• On Update: Delete specific cache on data modification
```

## Security Layers

```
┌─────────────────────────────────────┐
│     Security & Protection           │
├─────────────────────────────────────┤
│ 1. HTTPS/TLS                        │ (Future)
│ 2. JWT Authentication               │ ✓ Implemented
│ 3. Password Hashing (bcrypt)        │ ✓ Implemented
│ 4. MFA (Email/SMS)                  │ ✓ Implemented
│ 5. Input Validation (Zod)           │ ✓ Implemented
│ 6. Rate Limiting                    │ ◐ Phase 1.2
│ 7. CORS Protection                  │ ◐ Phase 1.2
│ 8. SQL Injection Prevention (Prisma)│ ✓ Implemented
│ 9. XSS Protection                   │ ◐ Phase 1.2
│ 10. CSRF Tokens                     │ ◐ Phase 1.2
└─────────────────────────────────────┘
```

## Deployment Architecture (Future)

```
                    ┌──────────────────┐
                    │ Load Balancer    │
                    │ (AWS ALB)        │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │Server 1 │         │Server 2 │         │Server 3 │
    │:3001    │         │:3001    │         │:3001    │
    └────┬────┘         └────┬────┘         └────┬────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
    │ PostgreSQL       │ │Redis Cluster │ │Message Queue │
    │ (RDS Multi-AZ)   │ │(AWS Elastics │ │(SQS/Kafka)   │
    │                  │ │Cache)        │ │              │
    └──────────────────┘ └──────────────┘ └──────────────┘

         ┌─────────────────────────────────────────┐
         │   Monitoring & Logging                  │
         │   - CloudWatch                          │
         │   - ELK Stack                           │
         │   - Datadog/New Relic                   │
         └─────────────────────────────────────────┘
```

---

**Last Updated:** Phase 1.1 Complete
**Next Phase:** Rate Limiting (Phase 1.2)
