import { loadEnv } from './utils/env-loader';
loadEnv();
import app from './app';
import prisma from './config/prismaClient';

prisma
  .$connect()
  .then(() => {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`DATABASE_URL:: ${process.env.DATABASE_URL}`);
      console.log(`Node_ENV: ${process.env.NODE_ENV}`);
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });
