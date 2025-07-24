import { PrismaClient, User, UserStatus, MfaType } from '@prisma/client';
import { RegisterUser, LoginUser } from '../../schema/user.schema';
import {
  PasswordUtils,
  TokenUtils,
  SecurityUtils,
} from '../../utils/shared/auth.utils';
import { EmailService } from './email.service';

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

interface AuthResponse {
  user: Omit<User, 'passwordHash' | 'passwordSalt' | 'refreshTokenHash'>;
  accessToken: string;
  refreshToken: string;
}

interface LoginResponse extends AuthResponse {
  requiresMfa?: boolean;
  mfaTypes?: MfaType[];
}

export class AuthService {
  private emailService: EmailService;

  constructor(private prisma: PrismaClient = prisma) {
    this.emailService = new EmailService();
  }

  // register service
  async register(
    data: RegisterUser,
    ipAddress?: string,
  ): Promise<AuthResponse> {
    try {
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
          'Please use a valid email address',
          'INVALID_EMAIL_DOMAIN',
          400,
        );
      }

      const { hash: passwordHash, salt: passwordSalt } =
        await PasswordUtils.hashPassword(data.password);
      const emailVerificationToken = TokenUtils.generateRandomToken();

      const user = await this.prisma.user.create({
        data: {
          firstname: data.firstname,
          lastname: data.lastname,
          email: data.email,
          username: data.username,
          bio: data.bio,
          passwordHash,
          passwordSalt,
          emailVerificationToken,
          emailVerificationExpires: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          lastPasswordChange: new Date(),
          lastKnownIp: ipAddress,
        },
      });

      await this.emailService.sendVerificationEmail(
        data.email,
        emailVerificationToken,
      );
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
        where: {
          id: user.id,
        },
        data: {
          refreshTokenHash,
          refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const {
        passwordHash: _,
        passwordSalt: __,
        refreshTokenHash: ___,
        ...userResponse
      } = user;

      return { user: userResponse, accessToken, refreshToken };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Registration failed', 'REGISTRATION_FAILED', 500);
    }
  }

  // login service

  async login(data: LoginUser, ipAddress: string): Promise<LoginResponse> {
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
        const updateData = {
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

      await this.prisma.user.update({
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
      });

      const {
        passwordHash: _,
        passwordSalt: __,
        refreshTokenHash: ___,
        ...UserResponse
      } = user;

      return {
        user: UserResponse,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Login failed', 'LOGIN_FAILED', 500);
    }
  }
}
