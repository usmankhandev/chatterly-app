import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import {
  userLogin,
  userRegister,
  userRefreshToken,
  userChangePassword,
  userEmailVerify,
  userForgotPassword,
  userResendVerificationEmail,
} from '../schema/user.schema';
import { AuthError, AuthService } from '../services/auth.service';
import prisma from '../config/prismaClient';
import { User } from '.prisma/client/default';
import { ZodError } from 'zod';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console(),
  ],
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const authService = new AuthService(prisma);

export class AuthController {
  // register

  static async register(req: Request, res: Response): Promise<void> {
    const requestId = req.get('X-Request-ID') || 'unknown';
    try {
      logger.info('Processing registration request', {
        requestId,
        email: req.body.email,
      });
      // Extracting user info.
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Validate user req/data using zod.

      const validatedData = userRegister.parse(req.body);

      // Call the service method.
      const result = await authService.register(validatedData, ipAddress);

      // Set secure http-only cookie for refresh token.

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      logger.info('User Registered Successfully', {
        requestId,
        userId: result.user.id,
      });
      // Send the response and did not include the refresh token in JSON.

      res.status(201).json({
        success: true,
        message: 'Registered Successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      logger.error('Registration Failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.issues,
        });
      }

      if (error instanceof AuthError) {
        console.error('Registration Failed Error', error);
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      console.error('Unexpected Error during Registration', error);
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }

  // Verify email

  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const token = req.query.token as string;
      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Verification token is required',
        });
        return;
      }
      const validatedData = userEmailVerify.parse({ token });
      try {
        await authService.verifyEmail(validatedData);
      } catch (error) {
        console.log(error);
        if (error instanceof AuthError) throw error;
        throw new AuthError(
          'Try catch of verifyEmail function failed',
          'VERIFY_EMAIL_FAILED',
          400,
        );
      }

      res.status(200).json({
        success: true,
        message: 'Email has been verified successfully',
      });
    } catch (error) {
      if (error instanceof AuthError) throw error;
      console.error('Email verification error', error);
      throw new AuthError(
        'Email verification failed',
        'EMAIL_VERIFICATION_FAILED_SERVER_LEVEL',
        500,
      );
    }
  }

  // Resend verification email

  static async resendVerificationEmail(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      console.log(`email in request: ${req.body.email}`);
      const email = userResendVerificationEmail.parse(req.body);
      console.log(`email after parsing: ${email.email}`);
      try {
        await authService.resendVerificationEmail(email);
      } catch (error) {
        console.error('Failed to resend verification email:', error);
        throw new AuthError(
          'Failed to resend verification email',
          'INTERNAL_SERVER_RESEND_VERIFICATION_FAILED',
          500,
        );
      }

      res.status(200).json({
        success: true,
        message: 'Verification email resent successfully',
      });
    } catch (error) {
      if (error instanceof AuthError) throw error;
      console.error(
        'Unexpected error during resend verification email:',
        error,
      );
      throw new AuthError(
        'Resend verification email failed at server level',
        'INTERNAL_SERVER_RESEND_VERIFICATION_FAILED',
        500,
      );
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const validatedData = userLogin.parse(req.body);
      const result = await authService.login(
        validatedData,
        typeof ipAddress === 'string' ? ipAddress : '',
      );

      if (result.requiresMfa) {
        res.status(200).json({
          success: true,
          message: 'MFA Verification Required',
          data: {
            requiresMfa: true,
            mfaTypes: result.mfaTypes,
            userId: result.user.id,
          },
        });
        return;
      }

      // Set refresh token cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: 'Login Successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('Zod validation error', error.issues);
        res.status(400).json({
          success: false,
          message: 'Validation Failed',
          code: 'VALIDATION_FAILED',
          errors: error.issues,
        });
      }

      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      console.error('Unexpected Error during Login', error);
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
      });
    }
  }

  async generateRefreshToken() {}

  static async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken)
        return res
          .status(401)
          .json({ success: false, message: 'Refresh token not provided' });

      if (req.body.refreshToken) userRefreshToken.parse(req.body);
      const result = await authService.refreshToken(refreshToken);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: { accessToken: result.accessToken },
      });
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
        return;
      }

      throw new AuthError(
        'refreshToken Not refreshed',
        'REFRESH_TOKEN_NOT_REFRESHED',
        500,
      );
    }
  }

  // Logout user

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AuthError('Not authenticated', 'USER_NOT_AUTHENTICATED', 401);
      }
      await authService.logout(userId);
      res.clearCookie('refreshToken');
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Logout Failed', 'USER_LOGOUT_FAILED', 500);
    }
  }

  // Forgot password

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = userForgotPassword.parse(req.body);
      await authService.forgotPassword(validatedData);
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Forgot password failed',
        'FORGOT_PASSWORD_FAILED',
        500,
      );
    }
  }

  // Reset password

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }
      const validatedData = userChangePassword.parse(req.body);
      await authService.changePassword(userId, validatedData);
      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Password change failed',
        'CHANGE_PASSWORD_FAILED',
        500,
      );
    }
  }

  // Get current user profile

  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          username: true,
          bio: true,
          profilePicture: true,
          coverPhoto: true,
          isEmailVerified: true,
          accountStatus: true,
          mfaEnabled: true,
          visibility: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Unable to get current user profile',
        'USER_PROFILE_FETCH_FAILED',
        500,
      );
    }
  }

  // token generation and hashing

  // async hashRefreshToken() {}

  static async hashRefreshToken(req: Request): Promise<string> {
    const { refreshToken } = req.body._refreshTokenHash;
    const saltRounds = 10;
    try {
      // Hash the refresh token using bcrypt
      const hashedToken = await bcrypt.hash(refreshToken, saltRounds);
      return hashedToken;
    } catch (error) {
      console.error('Error hashing refresh token:', error);
      throw new Error('Hashing failed');
    }
  }
}
