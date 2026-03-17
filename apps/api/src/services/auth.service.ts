import { PrismaClient, User, UserStatus, Prisma } from '@prisma/client';
import {
  RegisterUser,
  LoginUser,
  ForgotPassword,
  EmailVerification,
  ChangePassword,
  ResendVerificationEmail,
} from '../schema/user.schema';
import {
  PasswordUtils,
  TokenUtils,
  SecurityUtils,
} from '../utils/shared/auth.utils';
import {
  AuthResponse,
  LoginResponse,
  ChangePasswordResponse,
  EmailVerificationResponse,
  ForgotPasswordResponse,
  EnableMFAResponse,
  ResendVerificationEmailResponse,
  MfaVerificationResponse,
  MfaChallengeResponse,
  VerifyMfaDuringLoginResponse,
  MfaCodeResponse,
  verifyMfaCodeResponse,
} from '../types/auth.types';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

export class AuthError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// AuthService class.
export class AuthService {
  private emailService: EmailService;

  constructor(private prisma: PrismaClient = prisma) {
    this.emailService = new EmailService();
    this.prisma = prisma;
  }

  async register(
    data: RegisterUser,
    ipAddress?: string | null,
  ): Promise<AuthResponse> {
    try {
      let user: any;
      let createdUser: any;
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: data.email }, { username: data.username }],
        },
      });

      if (existingUser) {
        if (existingUser.email === data.email) {
          throw new AuthError(
            'Email is already registered',
            'EMAIL_EXISTS',
            409,
          );
        }
        if (existingUser.username === data.username) {
          throw new AuthError(
            'Username is already taken',
            'USERNAME_EXISTS',
            409,
          );
        }
      }

      if (!SecurityUtils.isValidEmailDomain(data.email)) {
        throw new AuthError(
          'Invalid email domain',
          'INVALID_EMAIL_DOMAIN',
          400,
        );
      }

      const { hash: passwordHash, salt: passwordSalt } =
        await PasswordUtils.hashPassword(data.password);
      const emailVerificationToken = TokenUtils.generateRandomToken();
      const userData = {
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        username: data.username,
        bio: data.bio,
        passwordHash,
        passwordSalt,
        emailVerificationToken,
        emailVerificationExpires: new Date(
          new Date().getTime() + 24 * 60 * 60 * 1000,
        ),
        lastPasswordChange: new Date(),
        lastKnownIp: ipAddress || null,
        mfaMethods: [],
      };
      try {
        console.log(`before user Data`, JSON.stringify(userData, null, 2));
        user = await this.prisma.user.create({
          data: userData,
        });

        console.log('User created successfully:', user);
      } catch (error) {
        console.error('Error creating user:', error);
        throw new AuthError('Registration failed', 'REGISTRATION_FAILED', 500);
      }
      if (!user || !user.id) {
        console.error('User creation returned invalid user object:', user);
        throw new AuthError(
          'User creation failed - invalid user object',
          'USER_CREATION_FAILED',
          500,
        );
      }
      console.log('EmailService instance:', this.emailService);
      try {
        console.log('Calling sendVerificationEmail with:', {
          email: data.email,
          token: emailVerificationToken,
        });
        await this.emailService.sendVerificationEmail(
          data.email,
          emailVerificationToken,
        );
      } catch (error) {
        console.error('Failed to send verification email:', error);
        throw new AuthError(
          'Failed to send verification email',
          'EMAIL_VERIFICATION_FAILED',
          500,
        );
      }

      const accessToken = TokenUtils.generateAccessToken(
        user.id,
        user.jwtVersion,
        user.email,
      );
      const refreshToken = TokenUtils.generateRefreshToken(
        user.id,
        user.jwtVersion,
        user.email,
      );
      const refreshTokenHash = await TokenUtils.hashRefreshToken(refreshToken);

      let updatedUser;
      try {
        updatedUser = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            refreshTokenHash,
            refreshTokenExpires: new Date(
              new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
            ),
          },
          select: {
            id: true,
            username: true,
            email: true,
            firstname: true,
            lastname: true,
            isEmailVerified: true,
            createdAt: true,
          },
        });
        console.log('Updated user:', updatedUser);
      } catch (error) {
        console.error('Error updating user with refresh token:', error);
        throw new AuthError(
          'Failed to update user with refresh token',
          'UPDATE_FAILED',
          500,
        );
      }

      const userResponse = {
        ...updatedUser,
        id: user.id,
      } as Omit<User, 'passwordHash' | 'passwordSalt' | 'refreshTokenHash'>;

      return { user: userResponse, accessToken, refreshToken };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      console.error('Unexpected error during registration:', error);
      throw new AuthError('Registration failed', 'REGISTRATION_FAILED', 500);
    }
  }

  // Verify email.

  async verifyEmail(
    data: EmailVerification,
  ): Promise<EmailVerificationResponse> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          emailVerificationToken: data.token,
          emailVerificationExpires: { gt: new Date() },
        },
      });

      if (!user)
        throw new AuthError(
          'Invalid or expired email verification token',
          'INVALID_EMAIL_VERIFICATION_TOKEN',
          400,
        );

      let updatedUser: User;
      try {
        updatedUser = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            isEmailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpires: null,
            securityEvents: {
              push: SecurityUtils.createSecurityEvent(
                'EMAIL_VERIFIED',
                'Email verified successfully',
              ),
            },
          },
        });

        const accessToken = TokenUtils.generateAccessToken(
          updatedUser.id,
          updatedUser.jwtVersion,
          updatedUser.email,
        );
        const refreshToken = TokenUtils.generateRefreshToken(
          updatedUser.id,
          updatedUser.jwtVersion,
          updatedUser.email,
        );
        const refreshTokenHash =
          await TokenUtils.hashRefreshToken(refreshToken);
        await this.prisma.user.update({
          where: { id: updatedUser.id },
          data: {
            refreshTokenHash,
            refreshTokenExpires: new Date(
              new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
            ),
          },
        });

        const {
          passwordHash,
          passwordSalt,
          refreshTokenHash: _refreshTokenHash,
          ...safeUser
        } = updatedUser;

        const userResponse: EmailVerificationResponse['user'] = {
          ...safeUser,
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        };

        return {
          user: userResponse,
          accessToken,
          refreshToken,
        };
      } catch (error) {
        console.error('Error updating user email verification:', error);
        throw new AuthError(
          'Failed to verify email',
          'EMAIL_VERIFICATION_FAILED',
          409,
        );
      }
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Email verification failed at server level',
        'INTERNAL_SERVER_EMAIL_VERIFICATION_FAILED',
        500,
      );
    }
  }

  // Resend Verification Email

  async resendVerificationEmail(
    data: ResendVerificationEmail,
  ): Promise<ResendVerificationEmailResponse> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          email: data.email,
        },
      });

      if (!user) throw new AuthError('User not found', 'USER_NOT_FOUND', 404);

      // Check if email is already verified.
      if (user.isEmailVerified) {
        throw new AuthError(
          'Email already verified',
          'EMAIL_ALREADY_VERIFIED',
          400,
        );
      }
      // Throttling logic as resend only allow once every 5 minutes.
      const limit = new Date().getTime() - 10 * 60 * 1000;
      if (
        user.emailVerificationExpires &&
        new Date(user.emailVerificationExpires).getTime() > limit
      )
        throw new AuthError(
          'Please wait before requesting another verification email',
          'EMAIL_RESEND_TOO_SOON',
          429,
        );

      const token = TokenUtils.generateRandomToken();
      const expires = new Date(new Date().getTime() + 60 * 60 * 1000);
      if (isNaN(expires.getTime())) {
        throw new Error('Invalid expiration date');
      }
      console.log('NEW EXPIRATION DATE:', new Date(Date.now() + 3600000));
      try {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerificationToken: token,
            emailVerificationExpires: expires,
            securityEvents: {
              push: SecurityUtils.createSecurityEvent(
                'EMAIL_VERIFICATION_RESENT',
                'Email verification resent successfully',
              ),
            },
          },
        });
      } catch (error) {
        if (error instanceof AuthError) throw error;
        console.error('Error updating user for resend verification:', error);
        throw new AuthError(
          'Failed to resend verification email',
          'RESEND_VERIFICATION_FAILED',
          500,
        );
      }

      try {
        await this.emailService.sendVerificationEmail(user.email, token);
      } catch (error) {
        console.error('Failed to send verification email:', error);
        throw new AuthError(
          'Failed to send verification email',
          'EMAIL_VERIFICATION_FAILED',
          500,
        );
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          isEmailVerified: false,
          emailVerificationToken: token,
          emailVerificationExpires: expires,
        },
      } as ResendVerificationEmailResponse;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      console.error('Error updating user for resend verification:', error);
      throw new AuthError(
        'Failed to resend verification email',
        'INTERNAL_SERVER_RESEND_VERIFICATION_FAILED',
        500,
      );
    }
  }

  // login service

  async login(
    data: LoginUser,
    ipAddress?: string | null,
  ): Promise<LoginResponse> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            {
              email: data.identifier,
            },
            {
              username: data.identifier,
            },
          ],
        },
      });

      if (!user) {
        throw new AuthError('Invalid Credentials', 'INVALID_CREDENTIALS', 401);
      }

      if (user.accountStatus === UserStatus.SUSPENDED) {
        throw new AuthError('Account is Suspended', 'ACCOUNT_SUSPENDED', 403);
      }

      if (user.accountStatus === UserStatus.DEACTIVATED) {
        throw new AuthError(
          'Account is Deactivated',
          'ACCOUNT_DEACTIVATED',
          403,
        );
      }

      if (
        user.accountStatus === UserStatus.LOCKED ||
        SecurityUtils.isAccountLocked(user)
      ) {
        throw new AuthError(
          'Account is Temporarily Locked',
          'ACCOUNT_LOCKED',
          423,
        );
      }

      const isValidPassword = await PasswordUtils.verifyPassword(
        data.password,
        user.passwordHash,
      );

      if (!isValidPassword) {
        const newFailedAttepmts = user.loginAttempts + 1;
        const updateData: Prisma.UserUpdateInput = {
          loginAttempts: newFailedAttepmts,
          failedLoginAttempts: {
            ...(typeof user.failedLoginAttempts === 'object' &&
            user.failedLoginAttempts !== null
              ? user.failedLoginAttempts
              : {}),
            [new Date().toISOString()]: { ipAddress },
          },
        };

        if (newFailedAttepmts >= 5) {
          const lockDuration =
            SecurityUtils.calculateLockDuration(newFailedAttepmts);
          // assigning properties of lockedUntil and accountStatus to updateData
          updateData.lockedUntil = new Date(Date.now() + lockDuration);
          updateData.accountStatus = UserStatus.LOCKED;
        }

        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: updateData,
        });

        throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
      }
      if (user.isEmailVerified === false) {
        throw new AuthError('Email not verified', 'EMAIL_NOT_VERIFIED', 403);
      }
      if (user.mfaEnabled && user.mfaMethods.length > 0) {
        return {
          user: {
            id: user.id,
          } as never,
          accessToken: '',
          refreshToken: '',
          requiresMfa: true,
          mfaTypes: user.mfaMethods,
        };
      }

      const accessToken = TokenUtils.generateAccessToken(
        user.id,
        user.jwtVersion,
        user.email,
      );
      const refreshToken = TokenUtils.generateRefreshToken(
        user.id,
        user.jwtVersion,
        user.email,
      );

      const refreshTokenHash = await TokenUtils.hashRefreshToken(refreshToken);

      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          refreshTokenHash,
          refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lastLoginAt: new Date(),
          lastKnownIp: ipAddress,
          loginAttempts: 0,
          lockedUntil: null,
          accountStatus: UserStatus.ACTIVE,
        },
        select: {
          id: true,
          username: true,
          email: true,
          firstname: true,
          lastname: true,
          isEmailVerified: true,
        },
      });

      const userReponse = {
        ...updatedUser,
        id: user.id,
      } as Omit<User, 'passwordHash' | 'passwordSalt' | 'refreshTokenHash'>;

      return {
        user: userReponse,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Login failed', 'LOGIN_FAILED', 500);
    }
  }

  // Refresh Token.

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = TokenUtils.verifyRefreshToken(refreshToken);
      if (!payload)
        throw new AuthError(
          'Invalid refresh token',
          'INVALID_REFRESH_TOKEN',
          401,
        );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
      if (user.jwtVersion !== payload.jwtVersion)
        throw new AuthError(
          'Token has been invalidated',
          'TOKEN_INVALIDATED',
          401,
        );

      if (
        !user.refreshTokenHash ||
        !(await TokenUtils.verifyHashedRefreshToken(
          refreshToken,
          user.refreshTokenHash,
        ))
      ) {
        throw new AuthError(
          'Invalid refresh token',
          'INVALID_REFRESH_TOKEN',
          401,
        );
      }

      const accessToken = TokenUtils.generateAccessToken(
        user.id,
        user.jwtVersion,
        user.email,
      );
      const newRefreshToken = TokenUtils.generateRefreshToken(
        user.id,
        user.jwtVersion,
        user.email,
      );

      const refreshTokenHash =
        await TokenUtils.hashRefreshToken(newRefreshToken);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          refreshTokenHash,
          refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Token refresh failed', 'REFRESH_FAILED', 500);
    }
  }

  // Logout

  async logout(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          refreshTokenHash: null,
          refreshTokenExpires: null,
          securityEvents: {
            push: SecurityUtils.createSecurityEvent(
              'LOGOUT',
              'User has logged out successfully',
            ),
          },
        },
      });
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Logout failed', 'LOGOUT_FAILED', 500);
    }
  }

  // Forgot password.

  async forgotPassword(data: ForgotPassword): Promise<ForgotPasswordResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
      const resetToken = TokenUtils.generateRefreshToken(
        user.id,
        user.jwtVersion,
        user.email,
      );

      if (!resetToken)
        throw new AuthError(
          'Failed to generate reset token',
          'RESET_TOKEN_GENERATION_FAILED',
          500,
        );
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          securityEvents: {
            push: SecurityUtils.createSecurityEvent(
              'PASSWORD_RESET_REQUEST',
              'Password reset required',
            ),
          },
        },
      });
      await this.emailService.sendResetPasswordEmail(data.email, resetToken);
      return {
        success: true,
        message: 'Password reset email sent successfully.',
        email: data.email,
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Email verification failed',
        'EMAIL_VERIFICATION_FAILED',
        500,
      );
    }
  }

  // Change password

  async changePassword(
    userId: string,
    data: ChangePassword,
  ): Promise<ChangePasswordResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
      const isValid = await PasswordUtils.verifyPassword(
        data.currentPassword,
        user.passwordHash,
      );
      if (!isValid)
        throw new AuthError(
          'Current password is incorrect',
          'INVALID_CURRENT_PASSWORD',
          400,
        );

      if (data.newPassword !== data.confirmPassword)
        throw new AuthError(
          'Passwords do not match',
          'MISMATCHED_PASSWORDS',
          403,
        );
      const { hash, salt } = await PasswordUtils.hashPassword(data.newPassword);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hash,
          passwordSalt: salt,
          lastPasswordChange: new Date(),
          jwtVersion: { increment: 1 },
          securityEvents: {
            push: SecurityUtils.createSecurityEvent(
              'PASSWORD_CHANGED',
              'Password changed successfully',
            ),
          },
        },
      });
      return {
        success: true,
        message: 'Password changed successfully',
        userId: user.id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Password change failed',
        'CHANGE_PASSWORD_FAILED',
        500,
      );
    }
  }

  // MFA Functions.

  async enableTotpMfa(userId: string): Promise<EnableMFAResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
      const secret = TokenUtils.generateTotpSecret();
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            mfaEnabled: true,
            mfaMethods: { push: 'TOTP' },
            mfaSecret: secret,
          },
        });
      } catch (error) {
        if (error instanceof AuthError) throw error;
        console.log(`error in AuthError`, error);
        throw new AuthError(
          'Error in updating mfa in prisma update',
          'MFA_NOT_ENABLED',
          400,
        );
      }
      const otpauthUrl = TokenUtils.generateOtpAuthUrl(user.email, secret);
      return {
        success: true,
        message: 'TOTP-based MFA has been enabled.',
        method: 'TOTP',
        secret,
        otpauthUrl,
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      console.log(`error in AuthError`, error);
      throw new AuthError(
        'Error in updating mfa in prisma update',
        'MFA_NOT_ENABLED',
        500,
      );
    }
  }

  // verify Mfa Code

  async verifyTotpMfa(
    userId: string,
    totpCode: string,
  ): Promise<MfaVerificationResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user || !user.mfaSecret)
        throw new AuthError('User not found', 'USER_NOT_FOUND', 404);

      const isValidCode = TokenUtils.verifyTotpCode(user.mfaSecret, totpCode);
      if (!isValidCode)
        throw new AuthError('Invalid TOTP code', 'INVALID_TOTP_CODE', 401);

      return {
        success: true,
        message: 'TOTP code verified successfully.',
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Failed to verify TOTP code',
        'TOTP_VERIFICATION_FAILED',
        500,
      );
    }
  }

  // Setup MFA Challenge

  async initiateMfaChallenge(userId: string): Promise<MfaChallengeResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) throw new AuthError('User not found', 'USER_NOT_FOUND', 404);

      if (!user || !user.mfaMethods || user.mfaMethods.length === 0)
        throw new AuthError(
          'MFA is not enabled for this user',
          'MFA_NOT_ENABLED',
          403,
        );

      const method = 'TOTP';

      return {
        success: true,
        method,
        message: 'MFA challenge initiated. Please enter your code.',
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Failed to initiate MFA challenge',
        'MFA_FAILED',
        500,
      );
    }
  }

  // verifyDuringLogin function

  async verifyMfaDuringLogin(
    userId: string,
    method: string,
    code: string,
  ): Promise<VerifyMfaDuringLoginResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
      if (method === 'TOTP') {
        const isValid = TokenUtils.verifyTotpCode(user.mfaSecret!, code);
        if (!isValid)
          throw new AuthError('Invalid TOTP code', 'INVALID_MFA_CODE', 401);
      } else {
        throw new AuthError(
          'Unsupported MFA method',
          'UNSUPPORTED_MFA_METHOD',
          400,
        );
      }

      const accessToken = TokenUtils.generateAccessToken(
        user.id,
        user.jwtVersion,
        user.email,
      );

      const refreshToken = TokenUtils.generateRefreshToken(
        user.id,
        user.jwtVersion,
        user.email,
      );
      const refreshTokenHash = await TokenUtils.hashRefreshToken(refreshToken);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          refreshTokenHash,
          refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lastLoginAt: new Date(),
          loginAttempts: 0,
          lockedUntil: null,
          accountStatus: UserStatus.ACTIVE,
        },
      });

      return {
        success: true,
        message: 'MFA verification successful.',
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Failed to Verify MFA Challenge During Login',
        'MFA_VERIFICATION_FAILED_DURING_LOGIN',
        500,
      );
    }
  }

  async sendEmailMfaCode(userId: string): Promise<MfaCodeResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
      if (!user.mfaEnabled || !user.mfaMethods.includes('EMAIL')) {
        throw new AuthError(
          'EMAIL MFA not enabled',
          'EMAIL_MFA_NOT_ENABLED',
          400,
        );
      }
      const code = this.emailService.generateEmailOtpCode();
      const expiration = new Date(Date.now() + 10 * 60 * 1000);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          emailMfaCode: code,
          emailMfaCodeExpires: expiration,
          securityEvents: {
            push: SecurityUtils.createSecurityEvent(
              'MFA_EMAIL_SENT',
              'Email MFA code generated and sent',
            ),
          },
        },
      });
      await this.emailService.sendEmailMfaCode(user.email, code);
      return {
        success: true,
        message: 'MFA code sent to email.',
        method: 'EMAIL',
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Failed to Send Email MFA Code.',
        'FAILED_SENDING_EMAIL_MFA_CODE',
        500,
      );
    }
  }

  // verify EmailMfaCode

  async verifyEmailMfaCode(
    userId: string,
    code: string,
  ): Promise<verifyMfaCodeResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
      }

      const isCodeInvalid = user.emailMfaCode !== code;
      const isCodeExpired =
        !user.emailMfaCodeExpires || user.emailMfaCodeExpires < new Date();

      if (isCodeExpired || isCodeInvalid) {
        throw new AuthError('Invalid or expired code', 'INVALID_MFA_CODE', 401);
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          emailMfaCode: null,
          emailMfaCodeExpires: null,
        },
      });

      return {
        success: true,
        message: 'Email-based MFA verified successfully',
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Failed to Verify Email MFA Code.',
        'EMAIL_MFA_CODE_VERIFICATION_FAILED',
        500,
      );
    }
  }

  // SMS-based MFA

  async sendSmsMfaCode(userId: string): Promise<MfaCodeResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
      }
      if (!user.mfaEnabled || !user.mfaMethods.includes('SMS')) {
        throw new AuthError('SMS MFA not enabled', 'SMS_MFA_NOT_ENABLED', 400);
      }
      if (!user.smsPhone) {
        throw new AuthError(
          'User does not have a valid SMS phone number',
          'INVALID_SMS_PHONE',
          400,
        );
      }
      const code = SmsService.generateSmsOtpCode();
      await SmsService.sendMfaCode(user.smsPhone, code);
      const expiration = new Date(Date.now() + 10 * 60 * 1000);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          smsMfaCode: code,
          smsMfaCodeExpires: expiration,
          securityEvents: {
            push: SecurityUtils.createSecurityEvent(
              'MFA_SMS_SENT',
              'SMS MFA code generated and sent',
            ),
          },
        },
      });

      return {
        success: true,
        message: 'SMS OTP Code has been sent.',
        method: 'SMS',
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Failed to Send SMS MFA Code.',
        'FAILED_SENDING_SMS_MFA_CODE',
        500,
      );
    }
  }

  async verifySmsMfaCode(
    userId: string,
    code: string,
  ): Promise<verifyMfaCodeResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
      }
      if (!user.mfaEnabled || !user.mfaMethods.includes('SMS')) {
        throw new AuthError('SMS MFA not enabled', 'SMS_MFA_NOT_ENABLED', 400);
      }

      const isCodeInvalid = user.smsMfaCode !== code;
      const isCodeExpired =
        !user.smsMfaCodeExpires || user.smsMfaCodeExpires < new Date();
      if (isCodeInvalid || isCodeExpired)
        throw new AuthError('Invalid or expired code', 'INVALID_MFA_CODE', 401);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          smsMfaCode: null,
          smsMfaCodeExpires: null,
        },
      });

      return {
        success: true,
        message: 'SMS-based MFA verified successfully',
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Failed to Verify SMS MFA Code.',
        'SMS_MFA_CODE_VERIFICATION_FAILED',
        500,
      );
    }
  }
}
