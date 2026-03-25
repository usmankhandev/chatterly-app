# Chatterly Backend - Setup Instructions

After reorganizing the project structure, all backend infrastructure files are now in the `./server` directory.

## Project Structure

```
chatterly/
├── server/                      # Backend server (this folder)
│   ├── src/                     # TypeScript source code
│   ├── prisma/                  # Database schema & migrations
│   ├── docker-compose.yml       # Multi-container orchestration
│   ├── Dockerfile              # Server container image
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── eslint.config.js
│   └── Documentation files...
└── (Future client code - Angular, React, etc.)
```

## Quick Start

### 1. Start All Services (PostgreSQL, Redis, Server)

```bash
cd server/
docker compose up -d
```

This will:

- Start PostgreSQL on port 5433 (mapped to internal 5432)
- Start Redis on port 6379
- Start the Node.js server on port 3001
- Run Prisma migrations automatically

### 2. Verify Services

Check if everything is running:

```bash
# Check all containers
docker compose ps

# Check server logs
docker compose logs server -f

# Test health endpoint
curl http://localhost:3001/health
curl http://localhost:3001/ready

# Test Redis
docker compose exec redis redis-cli ping
```

### 3. Install Dependencies (if needed)

```bash
cd server/
npm install
```

### 4. Run Development Server Locally (without Docker)

```bash
cd server/

# Install dependencies
npm install

# Set up environment
cp .env.redis.example .env.local

# Start PostgreSQL and Redis via Docker only
docker compose up -d postgres redis

# Run server locally with hot reload
npm run dev
```

### 5. Run Tests

```bash
cd server/

# Unit tests
npm run test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Environment Variables

Create a `.env.local` file in the `server/` directory:

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5433/chatterly

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
NODE_ENV=development

# Email (configure based on your service)
EMAIL_SERVICE=gmail
EMAIL_FROM=your-email@gmail.com
EMAIL_PASSWORD=your-password

# SMS (configure based on your service)
SMS_SERVICE=twilio
SMS_ACCOUNT_SID=your-account-sid
SMS_AUTH_TOKEN=your-auth-token
```

## Docker Commands Cheat Sheet

All commands should be run from the `server/` directory:

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f
docker compose logs server -f
docker compose logs postgres -f
docker compose logs redis -f

# Rebuild server image (after code changes)
docker compose up -d --build server

# Access PostgreSQL
docker compose exec postgres psql -U postgres -d chatterly

# Access Redis CLI
docker compose exec redis redis-cli

# Remove all data (reset database)
docker compose down -v

# Check container status
docker compose ps

# Prune unused Docker resources
docker system prune -a
```

## Development Workflow

### Making Code Changes

After modifying code in `src/`, the server will automatically hot-reload if running locally:

```bash
cd server/
npm run dev
```

Or restart the Docker container:

```bash
docker compose restart server
```

### Database Changes

After modifying `prisma/schema.prisma`:

```bash
cd server/

# Create a migration
npx prisma migrate dev --name <your-migration-name>

# Apply pending migrations (Docker container)
docker compose exec server npx prisma migrate deploy

# View database
npx prisma studio
```

### Running Specific Tests

```bash
cd server/

# Run specific test file
npm run test -- <path-to-test-file>

# Run tests matching pattern
npm run test -- --testNamePattern="auth"
```

## Production Deployment

When deploying to production:

1. Update `docker-compose.yml` with production environment variables
2. Use a production database (managed PostgreSQL)
3. Use a managed Redis service (Redis Cloud, AWS ElastiCache)
4. Enable SSL/TLS for all connections
5. Set `NODE_ENV=production`
6. Use proper secrets management (AWS Secrets Manager, HashiCorp Vault)

Example production docker-compose.yml adjustments:

```yaml
environment:
  DATABASE_URL: ${PROD_DATABASE_URL} # From secrets
  REDIS_URL: ${PROD_REDIS_URL} # From secrets
  NODE_ENV: production
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find what's using the port
lsof -i :5433  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :3001  # Server

# Kill the process
kill -9 <PID>

# Or use different ports in docker-compose.yml
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# View PostgreSQL logs
docker compose logs postgres

# Try connecting manually
docker compose exec postgres psql -U postgres -d chatterly
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker compose ps redis

# Test Redis connection
docker compose exec redis redis-cli ping

# View Redis logs
docker compose logs redis
```

### Changes Not Reflecting

```bash
# Rebuild the server image
docker compose up -d --build server

# Or restart the container
docker compose restart server
```

## Documentation Files

- **REDIS_CACHING_GUIDE.md** - Comprehensive Redis caching architecture
- **CACHING_INTEGRATION_GUIDE.md** - Integration patterns for caching
- **REDIS_QUICKSTART.md** - Quick reference for Redis commands
- **NOTIFICATION_SERVICE_REFACTOR.md** - Notification service improvements
- **PHASE_1_1_IMPLEMENTATION_SUMMARY.md** - Phase 1.1 completion summary
- **PHASE_1_1_COMPLETION_CHECKLIST.md** - Verification checklist
- **PHASE_1_IMPLEMENTATION_STATUS.md** - Overall implementation status
- **test-redis.sh** - Testing script for Redis connectivity
- **.env.redis.example** - Environment variable template

## Next Steps

1. **Phase 1.2 - Rate Limiting** (5-10 days)
   - Implement request rate limiting middleware
   - Apply per-route policies

2. **Phase 2 - Message Queue** (10-15 days)
   - Integrate Bull/RabbitMQ for async processing
   - Handle email and SMS queuing

3. **Phase 3 - Search & Analytics** (10-15 days)
   - Elasticsearch integration
   - Analytics collection and reporting

See `PHASE_1_IMPLEMENTATION_STATUS.md` for the complete roadmap.

## Support

For issues or questions:

1. Check the relevant documentation file in this directory
2. Review test files in `src/tests/` for usage examples
3. Check logs: `docker compose logs -f`
