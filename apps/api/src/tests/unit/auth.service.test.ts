import { AuthService, AuthError } from '../../services/auth.service';
import { prismaMock } from '../../config/__mocks__/prismaClient';
import { LoginUser } from '../../schema/user.schema';
import {
  PasswordUtils,
  TokenUtils,
  SecurityUtils,
} from '../../utils/shared/auth.utils';
import { EmailService } from '../../services/email.service';
import { UserStatus } from '@prisma/client';
import { SmsService } from '../../services/sms.service';

jest.mock('../../utils/shared/auth.utils');

describe('AuthService', () => {
  const testUser = {
    firstname: 'Amina',
    lastname: 'Sheikh',
    email: 'amina.sheikh@example.com',
    username: 'aminasheikh001',
    password: 'Password123!',
    bio: 'Exploring the art of fullstack development',
  };

  const mockUser = {
    id: '1',
    ...testUser,
    passwordHash: 'hashedPassword',
    passwordSalt: 'salt',
    jwtVersion: 1,
    accountStatus: UserStatus.PENDING_VERIFICATION,
    emailVerificationToken: 'randomToken',
    emailVerificationExpires: new Date(Date.now() + 3600000),
    lastPasswordChange: new Date(),
    securityEvents: [],
    isEmailVerified: false,
    profilePicture: null,
    coverPhoto: null,
    mfaEnabled: false,
    mfaMethods: [],
    mfaSecret: null,
    backupCodes: null,
    visibility: 'PUBLIC',
    loginAttempts: 0,
    lockedUntil: null,
    failedLoginAttempts: {},
    refreshTokenHash: null,
    refreshTokenExpires: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    lastLoginAt: null,
    lastKnownIp: '127.0.0.1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  // Spy on utils
  const secret = 'totp-secret';
  const otpauthUrl = 'otpauth://totp/app';
  const mockCode = '123456';

  let authService: AuthService;
  const MOCK_DATE = new Date('2025-08-02T10:00:00.000Z');
  const MOCK_TIMESTAMP = MOCK_DATE.getTime();

  beforeEach(() => {
    authService = new AuthService(prismaMock);
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_DATE);

    jest.spyOn(PasswordUtils, 'hashPassword').mockResolvedValue({
      hash: 'hashedPassword',
      salt: 'salt',
    });

    jest.spyOn(PasswordUtils, 'verifyPassword').mockResolvedValue(true);

    jest
      .spyOn(TokenUtils, 'generateAccessToken')
      .mockReturnValue('accessToken');
    jest
      .spyOn(TokenUtils, 'generateRefreshToken')
      .mockReturnValue('refreshToken');
    jest
      .spyOn(TokenUtils, 'generateRandomToken')
      .mockReturnValue('randomToken');
    jest
      .spyOn(TokenUtils, 'hashRefreshToken')
      .mockResolvedValue('hashedRefreshToken');
    jest.spyOn(TokenUtils, 'verifyAccessToken').mockReturnValue({
      userId: mockUser.id,
      jwtVersion: mockUser.jwtVersion,
      email: mockUser.email,
      type: 'access',
    });
    jest.spyOn(TokenUtils, 'verifyRefreshToken').mockReturnValue({
      userId: mockUser.id,
      jwtVersion: mockUser.jwtVersion,
      email: mockUser.email,
      type: 'refresh',
    });
    jest.spyOn(TokenUtils, 'verifyHashedRefreshToken').mockResolvedValue(true);

    jest.spyOn(SecurityUtils, 'isValidEmailDomain').mockReturnValue(true);
    jest
      .spyOn(SecurityUtils, 'createSecurityEvent')
      .mockReturnValue(expect.anything());
    jest
      .spyOn(EmailService.prototype, 'sendResetPasswordEmail')
      .mockResolvedValue(undefined);

    jest
      .spyOn(EmailService.prototype, 'sendVerificationEmail')
      .mockResolvedValue(undefined);

    jest.spyOn(TokenUtils, 'generateTotpSecret').mockReturnValue(secret);
    jest.spyOn(TokenUtils, 'generateOtpAuthUrl').mockReturnValue(otpauthUrl);
    jest.spyOn(TokenUtils, 'verifyTotpCode').mockReturnValue(true);
    // Email Spying Utilities
    jest
      .spyOn(EmailService.prototype, 'generateEmailOtpCode')
      .mockReturnValue(mockCode);
    jest
      .spyOn(EmailService.prototype, 'sendEmail')
      .mockResolvedValue(undefined);
    jest
      .spyOn(EmailService.prototype, 'sendEmailMfaCode')
      .mockResolvedValue(undefined);
    // SMS Spying Utilities
    jest.spyOn(SmsService, 'generateSmsOtpCode').mockReturnValue(mockCode);
    jest.spyOn(SmsService, 'sendMfaCode').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('Should register a new user successfully', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser as any);
      prismaMock.user.update.mockResolvedValue(mockUser as any);

      const result = await authService.register(testUser, '127.0.0.1');

      expect(result).toEqual({
        user: expect.objectContaining({
          id: '1',
          firstname: testUser.firstname,
          lastname: testUser.lastname,
          username: testUser.username,
          email: testUser.email,
          bio: testUser.bio,
        }),
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstname: testUser.firstname,
          lastname: testUser.lastname,
          email: testUser.email,
          username: testUser.username,
          bio: testUser.bio,
          passwordHash: 'hashedPassword',
          passwordSalt: 'salt',
          emailVerificationToken: 'randomToken',
          emailVerificationExpires: expect.any(Date),
          lastPasswordChange: expect.any(Date),
          lastKnownIp: '127.0.0.1',
        }),
      });

      expect(TokenUtils.generateAccessToken).toHaveBeenCalled();
      expect(TokenUtils.generateRefreshToken).toHaveBeenCalled();
      expect(EmailService.prototype.sendVerificationEmail).toHaveBeenCalled();
    });

    it('Should throw an error if email already exists', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: '1',
        email: testUser.email,
        username: 'different',
      } as any);

      await expect(authService.register(testUser, '127.0.0.1')).rejects.toThrow(
        new AuthError('Email is already registered', 'EMAIL_EXISTS', 409),
      );
    });

    it('should throw error for invalid email domain', async () => {
      jest.spyOn(SecurityUtils, 'isValidEmailDomain').mockReturnValue(false);
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(authService.register(testUser, '127.0.0.1')).rejects.toThrow(
        new AuthError('Invalid email domain', 'INVALID_EMAIL_DOMAIN', 400),
      );
    });
  });

  describe('verifyEmail', () => {
    const verifyEmailData = { token: 'randomToken' };

    it('should verify email successfully', async () => {
      prismaMock.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await authService.verifyEmail(verifyEmailData);

      expect(result).toEqual({
        user: expect.objectContaining({
          id: '1',
          email: mockUser.email,
          username: mockUser.username,
        }),
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        }),
      });
    });
  });

  // resend verification email tests

  describe('resendVerificationEmail', () => {
    const resendVerificationEmailData = {
      email: testUser.email,
    };

    const unverifiedMockUser = {
      ...mockUser,
      isEmailVerified: false,
      emailVerificationToken: 'oldToken',
      emailVerificationExpires: new Date(MOCK_TIMESTAMP - 3600000),
    };

    const updatedUser = {
      ...unverifiedMockUser,
      emailVerificationToken: 'newRandomToken',
      emailVerificationExpires: new Date(MOCK_TIMESTAMP + 3600000),
    };

    it('should resend verification email', async () => {
      prismaMock.user.findFirst.mockResolvedValue(unverifiedMockUser as any);
      prismaMock.user.update.mockResolvedValue(updatedUser as any);

      const result = await authService.resendVerificationEmail(
        resendVerificationEmailData,
      );
      expect(result).toEqual({
        user: expect.objectContaining({
          id: '1',
          email: unverifiedMockUser.email,
          isEmailVerified: false,
          emailVerificationToken: expect.any(String),
          emailVerificationExpires: new Date(MOCK_TIMESTAMP + 3600000),
        }),
      });
    });
  });

  // Login Test

  describe('login', () => {
    const loginData: LoginUser = {
      identifier: testUser.email,
      password: testUser.password,
      rememberMe: false,
    };

    const activeMockUser = {
      ...mockUser,
      isEmailVerified: true,
      mfaEnabled: true,
      accountStatus: UserStatus.ACTIVE,
    };
    const unverifiedUser = {
      ...mockUser,
      isEmailVerified: false,
      accountStatus: UserStatus.PENDING_VERIFICATION,
    };
    it('should login user successfully with email', async () => {
      prismaMock.user.findFirst.mockResolvedValue(activeMockUser as any);
      prismaMock.user.update.mockResolvedValue(activeMockUser as any);

      const result = await authService.login(loginData);
      expect(result).toEqual({
        user: expect.objectContaining({
          id: '1',
          firstname: mockUser.firstname,
          lastname: mockUser.lastname,
          email: mockUser.email,
          username: mockUser.username,
          isEmailVerified: true,
          mfaEnabled: true,
          accountStatus: UserStatus.ACTIVE,
        }),
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });
    });

    it('should throw error for invalid credentials', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow(
        new AuthError('Invalid Credentials', 'INVALID_CREDENTIALS', 401),
      );
    });

    it('should throw error for unverified email', async () => {
      prismaMock.user.findFirst.mockResolvedValue(unverifiedUser as any);
      await expect(authService.login(loginData)).rejects.toThrow(
        new AuthError('Email not verified', 'EMAIL_NOT_VERIFIED', 403),
      );
    });
  });

  // Forgot password tests

  describe('forgotPassword', () => {
    const forgotPasswordData = { email: testUser.email };
    const unverifiedMockUser = {
      ...mockUser,
      isEmailVerified: false,
      passwordResetToken: null,
      passwordResetExpires: null,
    };

    it('should send a password reset email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(unverifiedMockUser as any);
      prismaMock.user.update.mockResolvedValue(unverifiedMockUser as any);
      const result = await authService.forgotPassword(forgotPasswordData);
      expect(result).toEqual({
        success: true,
        message: 'Password reset email sent successfully.',
        email: unverifiedMockUser.email,
      });
    });
  });

  // Reset password tests

  describe('changePassword', () => {
    const changePasswordData = {
      currentPassword: 'abc',
      newPassword: '123',
      confirmPassword: '123',
    };

    const verifiedMockUser = {
      ...mockUser,
      isEmailVerified: true,
      passwordHash: 'oldHashedPassword',
    };

    it('should change or reset the password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(verifiedMockUser as any);
      prismaMock.user.update.mockResolvedValue(verifiedMockUser as any);

      const result = await authService.changePassword(
        verifiedMockUser.id,
        changePasswordData,
      );
      expect(result).toEqual({
        success: true,
        message: 'Password changed successfully',
        userId: verifiedMockUser.id,
        email: verifiedMockUser.email,
        isEmailVerified: verifiedMockUser.isEmailVerified,
      });
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.changePassword('nonExistentId', changePasswordData),
      ).rejects.toThrow('User not found');
    });

    it('should thrown an error if current password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue(verifiedMockUser as any);

      jest.spyOn(PasswordUtils, 'verifyPassword').mockResolvedValue(false);

      await expect(
        authService.changePassword(verifiedMockUser.id, changePasswordData),
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw an error if new and confirm passwords do not match', async () => {
      const mismatchedData = {
        ...changePasswordData,
        newPassword: '123',
        confirmPassword: '456',
      };

      prismaMock.user.findUnique.mockResolvedValue(verifiedMockUser as any);

      await expect(
        authService.changePassword(verifiedMockUser.id, mismatchedData),
      ).rejects.toThrow('Passwords do not match');
    });
  });

  // MFA Tests

  describe('enableTotpMfa', () => {
    const enableMFAMockUser = {
      ...mockUser,
      mfaEnabled: true,
      mfaMethods: ['TOTP'],
      mfaSecret: secret,
    };
    it('should enable TOTP MFA for the user and return secret and otpauth URL', async () => {
      prismaMock.user.findFirst.mockResolvedValue(enableMFAMockUser as any);
      prismaMock.user.update.mockResolvedValue(enableMFAMockUser as any);
      const result = await authService.enableTotpMfa(enableMFAMockUser.id);
      expect(result).toEqual({
        success: true,
        message: 'TOTP-based MFA has been enabled.',
        method: 'TOTP',
        secret,
        otpauthUrl,
      });
    });
  });

  // Verify MFATOTP

  describe('verifyTotpMfa', () => {
    const mfaEnabledUser = {
      ...mockUser,
      mfaSecret: 'totp-secret',
      mfaEnabled: true,
      mfaMethods: ['TOTP'],
    };
    const verifiedTotpMFAData = {
      userId: mockUser.id,
      totpCode: '123456',
    };

    it('should verify a valid TOTP code successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mfaEnabledUser as any);
      const result = await authService.verifyTotpMfa(
        verifiedTotpMFAData.userId,
        verifiedTotpMFAData.totpCode,
      );

      expect(result).toEqual({
        success: true,
        message: 'TOTP code verified successfully.',
      });
    });
  });
  // Initiate MFA Challenge
  describe('initiateMfaChallenge', () => {
    const mfaEnabledUser = {
      ...mockUser,
      mfaSecret: 'totp-secret',
      mfaEnabled: true,
      mfaMethods: 'TOTP',
    };

    it('should return method and masked channel for MFA challenge', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mfaEnabledUser as any);
      const result = await authService.initiateMfaChallenge(mfaEnabledUser.id);
      expect(result).toEqual({
        success: true,
        method: mfaEnabledUser.mfaMethods,
        message: 'MFA challenge initiated. Please enter your code.',
      });
    });
  });
  // Verify MFA During Login
  describe('verifyMfaDuringLogin', () => {
    const mfaEnabledUser = {
      ...mockUser,
      mfaEnabled: true,
      mfaSecret: 'totp-secret',
      jwtVersion: 1,
      mfaMethods: 'TOTP',
    };

    const verifyMfaDuringLoginData = {
      userId: mockUser.id,
      method: mfaEnabledUser.mfaMethods,
      totpCode: '123456',
    };

    it('should verify TOTP code and return tokens', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mfaEnabledUser as any);
      prismaMock.user.update.mockResolvedValue({
        ...mfaEnabledUser,
        refreshTokenHash: 'hashed refres token',
      } as any);

      const result = await authService.verifyMfaDuringLogin(
        verifyMfaDuringLoginData.userId,
        verifyMfaDuringLoginData.method,
        verifyMfaDuringLoginData.totpCode,
      );

      expect(result).toEqual({
        success: true,
        message: 'MFA verification successful.',
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });
    });
  });

  // Send Email MFA Code
  describe('sendEmailMfaCode', () => {
    const mfaEnabledUser = {
      ...mockUser,
      mfaEnabled: true,
      mfaMethods: 'EMAIL',
    };

    const generatedCode = '123456';
    it('should generate and send an email-based MFA code', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mfaEnabledUser as any);
      const result = await authService.sendEmailMfaCode(mfaEnabledUser.id);
      expect(result).toEqual({
        success: true,
        message: 'MFA code sent to email.',
        method: 'EMAIL',
      });

      expect(EmailService.prototype.sendEmailMfaCode).toHaveBeenCalledWith(
        mfaEnabledUser.email,
        generatedCode,
      );
    });
  });

  describe('verifyEmailMfaCode', () => {
    const mfaEnabledUser = {
      ...mockUser,
      emailMfaCode: '123456',
      emailMfaCodeExpires: new Date(Date.now() + 5 * 60 * 1000),
    };

    it('should verify a valid email MFA code', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mfaEnabledUser as any);
      const result = await authService.verifyEmailMfaCode(
        mfaEnabledUser.id,
        mfaEnabledUser.emailMfaCode,
      );
      expect(result).toEqual({
        success: true,
        message: 'Email-based MFA verified successfully',
      });
    });
    it('should throw error for invalid EMAIL code', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mfaEnabledUser as any);

      await expect(
        authService.verifyEmailMfaCode(mockUser.id, '000000'),
      ).rejects.toThrow(
        new AuthError('Invalid or expired code', 'INVALID_MFA_CODE', 401),
      );
    });
  });

  describe('sendSmsMfaCode', () => {
    const mfaEnabledUser = {
      ...mockUser,
      mfaEnabled: true,
      mfaMethods: ['SMS'],
      smsPhone: '+923075323455',
    };
    it('should generate and send SMS Mfa code', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mfaEnabledUser as any);
      prismaMock.user.update.mockResolvedValue(mfaEnabledUser as any);

      const result = await authService.sendSmsMfaCode(mfaEnabledUser.id);

      expect(result).toEqual({
        success: true,
        message: 'SMS OTP Code has been sent.',
        method: 'SMS',
      });
    });
  });

  describe('verifySmsMfaCode', () => {
    const mfaEnabledUser = {
      ...mockUser,
      mfaEnabled: true,
      mfaMethods: ['SMS'],
      smsMfaCode: '123456',
      smsMfaCodeExpires: new Date(Date.now() + 5 * 60 * 1000),
    };

    it('should verify a valid SMS MFA code', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mfaEnabledUser as any);
      const result = await authService.verifySmsMfaCode(
        mfaEnabledUser.id,
        mfaEnabledUser.smsMfaCode,
      );

      expect(result).toEqual({
        success: true,
        message: 'SMS-based MFA verified successfully',
      });
    });
  });
});
