import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const envFilePath = path.resolve(__dirname, `../../.env.${environment}`);
      const result = dotenv.config({ path: envFilePath });
      if (result.error) {
        return {
          success: false,
          error: `Failed to load environment variables file: ${result.error.message}`,
        };
      }
    }

    const { DATABASE_URL, NODE_ENV, PORT } = process.env;
    if (!DATABASE_URL) {
      return {
        success: false,
        error: `Database is required but not found in environment variables`,
      };
    }
    return {
      success: true,
      data: {
        NODE_ENV: NODE_ENV || 'development',
        DATABASE_URL,
        PORT: PORT || '3001',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Error Occurred',
    };
  }
}
