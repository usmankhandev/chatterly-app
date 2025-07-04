// src/utils/migrate.ts
import { loadEnv } from './env-loader';
import { PrismaClient } from '@prisma/client';

const env = loadEnv();

async function runMigrations() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL
      }
    }
  });

  try {
    console.log(`Running migrations on: ${env.DATABASE_URL.split('@')[0]}@******`);
    await prisma.$connect();
    
    if (process.env.NODE_ENV === 'development') {
      await prisma.$executeRaw`CREATE DATABASE IF NOT EXISTS chatterly`;
      console.log('✅ Development database ready');
    }
    
    await prisma.$executeRaw`PRISMA MIGRATION COMMAND HERE`;
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigrations();