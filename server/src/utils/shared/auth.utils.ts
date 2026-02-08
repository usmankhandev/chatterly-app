import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '@prisma/client';
import { ApiError } from './api-error.utils';
import { authenticator } from 'otplib';

interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpire: string;
  refreshTokenExpire: string;
}

export interface JWTBasePayload {
  userId: string;
  jwtVersion: number;
  email: string;
}

export interface AccessTokenPayload extends JWTBasePayload {
  type: 'access';
}

export interface RefresTokenPayload extends JWTBasePayload {
  type: 'refresh';
}

// Password Utils Class

export class PasswordUtils {
  // Hashing password.
  static async hashPassword(
    password: string,
  ): Promise<{ hash: string; salt: string }> {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);

    return {
      hash,
      salt,
    };
  }

  // Verifying password against hash.

  static async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Validate password strength
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;
    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include Lowercase letters!');
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');
    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers as well!');
    if (/[@!$%^&*!]/.test(password)) score += 1;
    else feedback.push('Include special characters as well!');
    if (!/(.)\1{2, }/.test(password)) score += 1;
    else feedback.push('Do not repeat characters');

    return {
      isValid: score >= 4,
      score,
      feedback,
    };
  }
  // Generate a secure random password
  static generateSecurePassword(length: number = 12): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*(){}:"<>?';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

// Token Utils Class

export class TokenUtils {
  private static getJWTConfig(): JWTConfig {
    return {
      accessTokenSecret:
        process.env.JWT_ACCESS_SECRET || 'my-secret-access-key',
      refreshTokenSecret:
        process.env.JWT_REFRESH_SECRET || 'my-secret-refresh-key',
      accessTokenExpire: process.env.JWT_ACCESS_EXPIRE || '30m',
      refreshTokenExpire: process.env.JWT_REFRESH_EXPIRE || '7d',
    };
  }

  static generateAccessToken(
    userId: string,
    jwtVersion: number,
    email: string,
  ): string {
    const config = this.getJWTConfig();
    const payload: AccessTokenPayload = {
      userId,
      jwtVersion,
      type: 'access',
      email,
    };
    return jwt.sign(payload, config.accessTokenSecret);
  }

  static generateRefreshToken(
    userId: string,
    jwtVersion: number,
    email: string,
  ): string {
    const config = this.getJWTConfig();
    const payload: RefresTokenPayload = {
      userId,
      jwtVersion,
      type: 'refresh',
      email,
    };
    return jwt.sign(payload, config.refreshTokenSecret);
  }

  static verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const config = this.getJWTConfig();
      const decoded = jwt.verify(
        token,
        config.accessTokenSecret,
      ) as AccessTokenPayload;

      if (decoded.type !== 'access') {
        throw new ApiError('Invalide Token Type', 401);
      }
      return decoded;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Invalid or Expired Access Token', 401);
    }
  }

  static verifyRefreshToken(token: string): RefresTokenPayload {
    try {
      const config = this.getJWTConfig();
      const decoded = jwt.verify(
        token,
        config.accessTokenSecret,
      ) as RefresTokenPayload;
      if (decoded.type !== 'refresh') {
        throw new ApiError('Invalid Token Type', 401);
      }
      return decoded;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Invalid or Expired Access Token', 401);
    }
  }

  // for email, password reset functions etc.

  static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static async hashRefreshToken(token: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(token, salt);
  }

  static async verifyHashedRefreshToken(
    token: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }

  static generateTotpSecret(): string {
    return authenticator.generateSecret();
  }

  static generateOtpAuthUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, 'Chatterly', secret);
  }

  static verifyTotpCode(secret: string, token: string): boolean {
    return authenticator.verify({ token, secret });
  }
}

// Security Utils

export class SecurityUtils {
  static generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random.toString().substring(2, 10);
      codes.push(code);
    }
    return codes;
  }

  static isAccountLocked(user: User): boolean {
    return user.lockedUntil ? new Date() < user.lockedUntil : false;
  }

  static calculateLockDuration(failedAttempts: number): number {
    const baseDelay = 5;
    const multiplier = Math.pow(2, Math.min(failedAttempts - 5, 4));
    return baseDelay * multiplier * 60 * 1000;
  }

  static generateTOTP(): string {
    return crypto
      .randomBytes(20)
      .toString('base64')
      .replace(/[+/]/g, '')
      .substring(0, 32);
  }

  // validateEmailDomain

  static isValidEmailDomain(email: string): boolean {
    const disposableDomains = [
      '10minuteemail.com',
      'guerrillamail.com',
      'mailinator.com',
      'tempmail.org',
      'throwaway.email',
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    return domain ? !disposableDomains.includes(domain) : false;
  }

  // createSecurityEvent

  static createSecurityEvent(
    type: string,
    description: string,
    ipAddres?: string,
    userAgent?: string,
    metaData?: Record<string, any>,
  ) {
    return {
      type,
      description,
      timestamp: new Date().toISOString(),
      ipAddres,
      userAgent,
      ...metaData,
    };
  }
  // exractDeviceInfo
}

// Rate limiting utility class

export class RateLimitUtils {
  // Create rate limit key for different operations

  static createRateLimitKey(operation: string, identifier: string): string {
    return `rate_limit:${operation}:${identifier}`;
  }

  // Get rate limit configuration for different operations

  static getRateLimitConfig(operation: string): {
    attempts: number;
    windowMs: number;
  } {
    const configs = {
      login: { attempts: 5, windowMs: 15 * 60 * 1000 },
      register: { attempts: 3, windowMs: 60 * 60 * 1000 },
      password_reset: { attempts: 3, windowMs: 30 * 60 * 1000 },
      email_verification: { attempts: 5, windowMs: 60 * 60 * 1000 },
      mfa_verify: { attempts: 5, windowMs: 15 * 60 * 1000 },
    };

    return (
      configs[operation as keyof typeof configs] || {
        attempts: 10,
        windowMs: 60 * 60 * 1000,
      }
    );
  }
}
