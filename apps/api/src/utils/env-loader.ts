import dotenv from 'dotenv';
import { exists } from 'fs';
import path from 'path';
// import { fileURLToPath } from 'url';

interface EnvironmentConfig {
  NODE_ENV: string;
  DATABASE_URL: string;
  PORT: string;
}

interface Success<Type> {
  success: true;
  data: Type;
}

interface Failure {
  success: false;
  error: string;
}

type Result<Type> = Success<Type> | Failure;

export function loadEnv(): Result<EnvironmentConfig> {
  const environment = process.env.NODE_ENV || 'development';

  try {
    if (environment !== 'production') {
      const envFilePath = path.resolve(process.cwd(), `.env.${environment}`);
      console.log(`Attempting to load: ${envFilePath}`);
      const result = dotenv.config({ path: envFilePath });
      if (result.error) {
        console.error('Dotenv error:', result.error);
        return {
          success: false,
          error: `Failed to load environment variables file: ${result.error.message}`,
        };
      }
      console.log(`Successfully loaded .env.${environment}`);
    }

    const { DATABASE_URL, NODE_ENV, PORT } = process.env;
    if (!DATABASE_URL) {
      console.error(
        'Available env vars:',
        Object.keys(process.env).filter((key) => key.includes('DATABASE')),
      );
      return {
        success: false,
        error: `Database is required but not found in environment variables`,
      };
    }

    console.log(`Environment loaded: NODE_ENV=${NODE_ENV}, PORT=${PORT}`);
    return {
      success: true,
      data: {
        NODE_ENV: NODE_ENV || 'development',
        DATABASE_URL,
        PORT: PORT || '3001',
      },
    };
  } catch (error) {
    console.error('Environment loading error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Error Occurred',
    };
  }
}
