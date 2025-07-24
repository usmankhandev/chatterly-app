import { Request, Response } from 'express';
import { userLogin, userRegister } from '../../schema/user.schema';
import { AuthError, AuthService } from './auth.service';
import prisma from '../../config/prismaClient';

const authService = new AuthService(prisma);

export class AuthController {
  // register

  static async register(req: Request, res: Response): Promise<void> {
    try {
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
      if (error instanceof AuthError) throw error;
      throw new AuthError('Registration failed', 'REGISTRATION_FAILED', 500);
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const validatedData = userLogin.parse(req.body);
      const result = await authService.login(
        validatedData,
        typeof ipAddress === 'string' ? ipAddress : '',
      );

      if (result.requiresMfa) {
        return res.status(200).json({
          success: true,
          message: 'MFA Verification Required',
          data: {
            requiresMfa: true,
            mfaTypes: result.mfaTypes,
            userId: result.user.id,
          },
        });
      }

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
      if (error instanceof AuthError) throw error;
      throw new AuthError('Login Failed', 'LOGIN_FAILED', 500);
    }
  }

  // login
  // async login(req: Request, res: Response): Promise<void> {}

  // // token generation and hashing

  // async generateRefreshToken() {}

  // async hashRefreshToken() {}

  // Logout user

  // Forgot password

  // Reset password

  // Verify email

  // Change password

  // Get current user profile
}
