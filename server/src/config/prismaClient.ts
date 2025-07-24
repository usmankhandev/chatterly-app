// src/config/prismaClient.ts
import { PrismaClient } from '@prisma/client';
import { loadEnv } from '../utils/env-loader';

loadEnv();

const prisma = new PrismaClient();

export default prisma;
