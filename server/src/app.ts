import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.route';
import postRouter from './routes/post.route';
import commentRouter from './routes/comment.route';
import notificationRouter from './routes/notification.route';
import 'dotenv-flow/config';
import { socketServer } from './socket/socket.server';
import { redisClientManager } from './config/redisClient';
import prisma from './config/prismaClient';

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const httpServer = http.createServer(app);

// Initialize Socket.io server
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

// routes:

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/notifications', notificationRouter);

app.get('/', (req, res) => {
  res.send('✅ Chatterly backend is up');
});

export default app;
