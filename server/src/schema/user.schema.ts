import { z } from 'zod';
// import { UserStatus, MfaType } from '@prisma/client';

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

// Export Types for Typescript

export type RegisterUser = z.infer<typeof userRegister>;
export type LoginUser = z.infer<typeof userLogin>;
