import { createClient, RedisClientType, RedisModules } from 'redis';
import { Logger } from 'winston';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

// Redis client with connection pooling
class RedisClientManager {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;
  private connectionRetryDelay: number = 2000; // ms
  private healthCheckInterval: NodeJS.Timeout | null = null;

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      logger.debug('Redis client already connected');
      return;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.maxConnectionAttempts) {
              logger.error(
                `Redis reconnection failed after ${this.maxConnectionAttempts} attempts`,
              );
              return new Error('Max redis reconnection attempts exceeded');
            }
            return this.connectionRetryDelay * (retries + 1);
          },
          connectTimeout: 10000,
          keepAlive: 30000,
          noDelay: true,
        },
      });

      // Set up event listeners
      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.client.on('error', (err) => {
        logger.error('Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis reconnecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis ready for commands');
      });

      await this.client.connect();
      this.isConnected = true;
      this.startHealthCheck();
      logger.info('Redis client initialized successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.connectionAttempts++;

      if (this.connectionAttempts < this.maxConnectionAttempts) {
        logger.info(
          `Retrying Redis connection in ${this.connectionRetryDelay}ms...`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, this.connectionRetryDelay),
        );
        await this.connect();
      } else {
        throw new Error(
          'Failed to connect to Redis after maximum attempts. Please ensure Redis is running.',
        );
      }
    }
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        if (this.client) {
          await this.client.ping();
        }
      } catch (error) {
        logger.error('Redis health check failed:', error);
        this.isConnected = false;
      }
    }, 30000); // Check every 30 seconds
  }

  async disconnect(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      this.client = null;
      logger.info('Redis client disconnected');
    }
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  isHealthy(): boolean {
    return this.isConnected && this.client !== null;
  }
}

// Export singleton instance
export const redisClientManager = new RedisClientManager();

export default redisClientManager;
