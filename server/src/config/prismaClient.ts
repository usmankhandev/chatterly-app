// src/config/prismaClient.ts
import { PrismaClient } from '@prisma/client';
import { loadEnv } from '../utils/env-loader';
import en from 'zod/v4/locales/en.cjs';

const envResult = loadEnv();

if (!envResult.success) {
  console.error('Environment loading failed:', envResult.error);
  throw new Error(`Failed to load environment variables: ${envResult.error}`);
}
console.log('Environment variables loaded successfully.');
console.log(`Database URL: ${envResult.data.DATABASE_URL}`);

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'test' ? ['error'] : ['error'],
  datasources: {
    db: {
      url: envResult.data.DATABASE_URL,
    },
  },
});

export default prisma;
