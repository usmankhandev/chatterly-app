import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prismaClient';
import { User } from '@prisma/client';
import { TokenUtils } from '../utils/shared/auth.utils';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    return authHeader.substring(7);
  }
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
};

export class AuthMiddleware {
  // Authenticate User.
  static async authenticateUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const token = extractToken(req);
      if (!token) {
        res.status(401).json({
          success: false,
          message: 'Access token required',
          code: 'NO_TOKEN',
        });
        return;
      }
      const payload = TokenUtils.verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({
          success: false,
          message: 'Invalid access token',
          code: 'INVALID_TOKEN',
        });
        return;
      }
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      req.user = user;

      if (user.jwtVersion !== payload.jwtVersion) {
        res.status(401).json({
          success: false,
          message: 'Token has been invalidated',
          code: 'TOKEN_INVALIDATED',
        });
        return;
      }
      if (user.accountStatus !== 'ACTIVE') {
        res.status(403).json({
          success: false,
          message: 'Account is not active',
          code: 'ACCOUNT_NOT_ACTIVE',
        });
        return;
      }
      next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication failed',
        code: 'AUTH_ERROR',
      });
    }
  }

  // optionalAuth

  static async optionalAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const token = extractToken(req);
      if (!token) return;
      const payload = TokenUtils.verifyAccessToken(token);
      if (!payload) return next();
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (
        user &&
        user.jwtVersion === payload.jwtVersion &&
        user.accountStatus === 'ACTIVE'
      )
        req.user = user;
      next();
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      next();
    }
  }

  // email verification middleware

  static requireEmailVerification(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }
    if (!req.user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    next();
  }

  // security headers middleware

  static async securityHeaders(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (process.env.NODE_ENV === 'production')
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    next();
  }
}
