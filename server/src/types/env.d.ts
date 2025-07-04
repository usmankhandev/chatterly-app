interface EnvironmentVariables {
  DATABASE_URL: string;
  PORT: string;
  NODE_ENV?: 'development' | 'production';
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvironmentVariables {}
  }
}

export {};