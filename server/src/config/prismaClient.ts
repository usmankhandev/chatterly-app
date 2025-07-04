// src/config/prismaClient.ts
import { PrismaClient } from '@prisma/client';
import { loadEnv } from '../utils/env-loader';

const env = loadEnv();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});

export default prisma;