import { User, MfaType } from '@prisma/client';

export interface AuthResponse {
  user: Omit<User, 'passwordHash' | 'passwordSalt' | 'refreshTokenHash'>;
  accessToken: string;
  refreshToken: string;
}

export interface ResendVerificationEmailResponse {
  user: {
    id: string;
    email: string;
    isEmailVerified: false;
    emailVerificationToken: string;
    emailVerificationExpires: Date;
  };
}

export interface EmailVerificationResponse extends AuthResponse {
  user: Omit<User, 'passwordHash' | 'passwordSalt' | 'refreshTokenHash'> & {
    isEmailVerified: true;
    emailVerificationToken: null;
    emailVerificationExpires: null;
  };
}

export interface LoginResponse extends AuthResponse {
  requiresMfa?: boolean;
  mfaTypes?: MfaType[];
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  email?: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
  userId?: string;
  email?: string;
  isEmailVerified?: boolean;
}

export interface EnableMFAResponse {
  success: boolean;
  message: string;
  method: 'TOTP';
  secret: string;
  otpauthUrl: string;
}

export interface MfaVerificationResponse {
  success: boolean;
  message: string;
}

export interface MfaChallengeResponse {
  success: boolean;
  method: MfaType;
  message: string;
}

export interface VerifyMfaDuringLoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface MfaCodeResponse {
  success: boolean;
  message: string;
  method: MfaType;
}

export interface verifyMfaCodeResponse {
  success: boolean;
  message: string;
}
