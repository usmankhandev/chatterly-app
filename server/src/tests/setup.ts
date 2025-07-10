import { PrismaClient } from '@prisma/client';
import { loadEnv } from '../utils/env-loader';

loadEnv();

const prisma = new PrismaClient();

// Clean test DB before each test;

beforeEach(async () => {
  await prisma.user.deleteMany();
});

// Close database connection after all tests;

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
