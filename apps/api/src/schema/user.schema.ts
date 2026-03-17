import { MfaType, SocialProvider } from '@prisma/client';
import { z } from 'zod';

// Basic user validation schemas

export const userRegister = z.object({
  firstname: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'First name can only contain letters, spaces, hyphens, and apostrophes.',
    ),

  lastname: z
    .string()
    .min(1, 'last name is required')
    .max(50, 'last name must be less than 50 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'last name can only contain letters, spaces, hyphens, and apostrophes.',
    ),

  email: z
    .email('Please provide a valid email')
    .max(255, 'Email must be less than 255 letters')
    .toLowerCase(),

  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens',
    ),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain one uppercase letter, one lowercase letter, one number and one special character.',
    ),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

export const userLogin = z.object({
  identifier: z
    .string()
    .min(1, 'Email or username is required')
    .max(255, 'Input is too long'),

  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long.'),

  rememberMe: z.boolean().optional().default(false),

  deviceInfo: z
    .object({
      userAgent: z.string().optional(),
      ipAddress: z.string().optional(),
      location: z.string().optional(),
    })
    .optional(),
});

// userRefreshToken schema.

export const userRefreshToken = z.object({
  refreshToke: z.string().min(1, 'Refresh token is required'),
});

// Forgot password schema.

export const userForgotPassword = z.object({
  email: z.email('Please provide a valid email address').toLowerCase(),
});

// Change password schema.

export const userChangePassword = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'New password must be less than 128 characters')
      .regex(
        /^(?=.*[a-z])(?=>*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        `New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character`,
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ['confirmPassword'],
  });

// Reset password schema.

export const userResetPassword = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()<>,.:";'{}])[A-Za-z\d!@#$%^&*()<>,.:";'{}]/,
        `New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character`,
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Email verify schemas.

export const userEmailVerify = z.object({
  token: z.string().min(1, 'Verification Token is required'),
});

export const userResendVerificationEmail = z.object({
  email: z.email('Please provide a valid email address').toLowerCase(),
});

// MFA (Multi-Factor Authentication) schema

export const userSetupMFA = z.object({
  MfaType: z.enum(MfaType),
  phoneNumber: z
    .string()
    .regex(
      /^\+[1-9]\d{1, 14}$/,
      'Please provide a valid phone number with country code',
    )
    .optional(),
  totpCode: z
    .string()
    .length(6, 'TOTP code must 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must contain only numbers')
    .optional(),
});

// Verify MFA (Multi-Factor Authentication) schema

export const userVerifyMFA = z.object({
  mfaCode: z
    .string()
    .min(4, 'MFA code must be at least 4 characters')
    .max(8, 'MFA code must be less than 8 characters')
    .regex(/^\d+$/, 'MFA code must contain only numbers'),
  mfaType: z.enum(MfaType),
});

// User Account Management schemas

export const userProfileUpdate = z.object({
  firstname: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'First name can only contain letters, spaces, hyphens, and apostrophes',
    )
    .optional(),

  lastname: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'Last name can only contain letters, spaces, hyphens, and apostrophes',
    )
    .optional(),

  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),

  profilePicture: z.url('Profile picture must be a valid URL').optional(),
  coverPhoto: z.url('Cover photo must be a valid URL').optional(),
});

// Social Login schemas

export const userSocialLogin = z.object({
  provider: z.enum(SocialProvider),
  providerAccountId: z
    .string()
    .min(1, 'Please provide account ID as it is required'),
  providerEmail: z.email('Invalid provider email').optional(),
  accessToken: z.string().min(1, 'Access Token is required'),
  refreshToken: z.string().min(1, 'Refresh Token is required'),
  tokenExpires: z.date().optional(),
  scope: z.string().optional(),
  // providerData: z.record(z.any()).optional(),
});

// Verify MFA During Login

// Export Types for Typescript

export type RegisterUser = z.infer<typeof userRegister>;
export type LoginUser = z.infer<typeof userLogin>;
export type RefreshToken = z.infer<typeof userRefreshToken>;
export type ForgotPassword = z.infer<typeof userForgotPassword>;
export type ChangePassword = z.infer<typeof userChangePassword>;
export type ResetPassword = z.infer<typeof userResetPassword>;
export type EmailVerification = z.infer<typeof userEmailVerify>;
export type ResendVerificationEmail = z.infer<
  typeof userResendVerificationEmail
>;
export type SetupMFA = z.infer<typeof userSetupMFA>;
export type VerifyMFA = z.infer<typeof userVerifyMFA>;
export type ProfileUpdate = z.infer<typeof userProfileUpdate>;
export type SocialLogin = z.infer<typeof userSocialLogin>;
