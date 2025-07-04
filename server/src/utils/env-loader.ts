// server/src/utils/env-loader.ts
import dotenv from 'dotenv';
import path from 'path';

interface EnvironmentConfig {
  DATABASE_URL: string;
  PORT: string;
  NODE_ENV: string;
}

export function loadEnv(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envPath = path.resolve(__dirname, `../../.env.${nodeEnv}`);

  const result = dotenv.config({ path: envPath });

  if (result.error) {
    throw new Error(`❌ Failed to load environment file at ${envPath}`);
  }

  const { DATABASE_URL, PORT } = process.env;

  if (!DATABASE_URL) {
    throw new Error(`❌ DATABASE_URL not found in ${envPath}`);
  }

  return {
    DATABASE_URL,
    PORT: PORT || '3001',
    NODE_ENV: nodeEnv
  };
}
