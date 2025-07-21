import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '@prisma/client';

interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpire: string;
  refreshTokenExpire: string;
}

const getJWTConfig = (): JWTConfig => ({
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'my-secret-access-key',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'my-secret-refresh-key',
  accessTokenExpire: process.env.JWT_ACCESS_EXPIRE || '30m',
  refreshTokenExpire: process.env.JWT_REFRESH_EXPIRE || '7d',
});
