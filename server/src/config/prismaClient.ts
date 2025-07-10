// src/config/prismaClient.ts
import { PrismaClient } from '@prisma/client';
import { loadEnv } from '../utils/env-loader';

loadEnv();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
});

export default prisma;
