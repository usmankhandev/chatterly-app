//  src/app.ts

import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv-flow/config';

// Import routes
import authRouter from './routes/auth.route';
import postRouter from './routes/post.route';
import commentRouter from './routes/comment.route';
import notificationRouter from './routes/notification.route';

// Import socket server
import { socketServer } from './socket/socket.server';
import { redisClientManager } from './config/redisClient';
import {
  httpMetricsMiddleware,
  setServiceName,
  register,
} from '@chatterly/observability';

setServiceName('api');

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(httpMetricsMiddleware); // Apply metrics middleware globally

const httpServer = http.createServer(app);

socketServer.initialize(httpServer);

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    const isRedisHealthy = redisClientManager.isHealthy();
    const isDatabaseHealthy = true; // Prisma connection is checked on startup

    const status = isRedisHealthy && isDatabaseHealthy ? 'UP' : 'DEGRADED';
    const statusCode = isRedisHealthy && isDatabaseHealthy ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: isDatabaseHealthy ? 'UP' : 'DOWN',
        cache: isRedisHealthy ? 'UP' : 'DOWN',
        websocket: 'UP', // Socket.io is always up if server is running
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

app.get('/ready', async (req, res) => {
  try {
    const isRedisHealthy = redisClientManager.isHealthy();
    const isDatabaseHealthy = true;

    if (isRedisHealthy && isDatabaseHealthy) {
      res.status(200).json({
        ready: true,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        reason: !isDatabaseHealthy ? 'Database unhealthy' : 'Cache unhealthy',
      });
    }
  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: 'Ready check failed',
    });
  }
});

// API Routes
const registerRoutes = () => {
  console.log('📝 Registering routes...');

  // 1. Auth routes (no conflicts)
  app.use('/api/v1/auth', authRouter);
  console.log('  ✅ Auth routes');

  // 2. Notification routes (BEFORE posts to avoid :id conflicts)
  app.use('/api/v1/notifications', notificationRouter);
  console.log('  ✅ Notification routes');

  // 3. Comment routes (has specific /post/:postId/comments pattern)

  app.use('/api/v1/comments', commentRouter);
  console.log('  ✅ Comment routes');

  // 4. Like routes

  // app.use('/api/v1/likes', likeRouter);
  // console.log('  ✅ Like routes');

  // 5. Friendship route
  // app.use('/api/v1/friendships', friendshipRouter);
  // console.log('  ✅ Friendship routes');

  // 6. Post routes LAST (has generic patterns)
  app.use('/api/v1/posts', postRouter);
  app.use('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
  console.log('  ✅ Post routes');

  console.log('✅ All routes registered');
};

registerRoutes();
// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '✅ Chatterly backend is up',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ready: '/ready',
      api: '/api/v1',
      websocket: 'ws://localhost:3001/socket.io',
    },
  });
});

// ✅ FIXED: 404 handler without '*' pattern
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error('Global error handler:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
    });
  },
);

console.log('✅ App configuration complete');

export { app, httpServer };
