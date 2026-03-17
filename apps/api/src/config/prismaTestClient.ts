import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const prismaTest = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: ['query', 'info', 'warn', 'error'],
});

export default prismaTest;
