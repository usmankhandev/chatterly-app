// src/index.ts
import { loadEnv } from './utils/env-loader';

// Load environment FIRST
const env = loadEnv();

// Now import other modules
import app from './app';
import prisma from './config/prismaClient';

prisma
  .$connect()
  .then(() => {
    const PORT = env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`DATABASE_URL:: ${env.DATABASE_URL}`);
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });
