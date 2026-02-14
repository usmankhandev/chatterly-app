import { loadEnv } from './utils/env-loader';
loadEnv();
import app from './app';
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
    app.listen(PORT, () => {
      console.log(`DATABASE_URL:: ${process.env.DATABASE_URL}`);
      console.log(
        `REDIS_URL:: ${process.env.REDIS_URL || 'redis://localhost:6379'}`,
      );
      console.log(`Node_ENV: ${process.env.NODE_ENV}`);
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server');
      await redisClientManager.disconnect();
      await prisma.$disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server');
      await redisClientManager.disconnect();
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
};

initializeServer();
