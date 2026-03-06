// src/index.ts

import { loadEnv } from './utils/env-loader';
loadEnv();

import { httpServer } from './app';
import prisma from './config/prismaClient';
import { redisClientManager } from './config/redisClient';

const initializeServer = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connected');

    // Connect to Redis
    await redisClientManager.connect();
    console.log('✅ Redis connected');

    const PORT = process.env.PORT || 3001;

    // ✅ LISTEN ON HTTP SERVER (NOT APP)
    httpServer.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(
        `🔌 WebSocket server ready on ws://localhost:${PORT}/socket.io`,
      );
      console.log(`🗄️  Database: Connected`);
      console.log(
        `📦 Redis: ${process.env.REDIS_URL || 'redis://localhost:6379'}`,
      );
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log('═══════════════════════════════════════════');
      console.log('');
      console.log('📍 API Endpoints:');
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   Ready:  http://localhost:${PORT}/ready`);
      console.log(`   API:    http://localhost:${PORT}/api/v1`);
      console.log('');
    });

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} signal received: closing server gracefully...`);

      // Close HTTP server (stops accepting new connections)
      httpServer.close(() => {
        console.log('✅ HTTP server closed');
      });

      // Close Redis connection
      await redisClientManager.disconnect();
      console.log('✅ Redis disconnected');

      // Close database connection
      await prisma.$disconnect();
      console.log('✅ Database disconnected');

      console.log('👋 Server shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
};

initializeServer();
