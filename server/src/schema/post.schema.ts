import { Visibility } from '@prisma/client';
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(150, 'Title must be less than 150 characters'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),
  imageUrl: z.url('Image URL must be a valid URL').optional(),
  visibility: z.enum(Visibility).optional().default(Visibility.PUBLIC),
});

export const updatePostSchema = z.object({
  title: z
    .string()
    .max(150, 'Title must be less than 150 characters')
    .optional(),
  content: z
    .string()
    .max(5000, 'Content must be less than 5000 characters')
    .optional(),
  imageUrl: z.url('Image URL must be a valid URL').optional(),
  visibility: z.enum(Visibility).optional(),
});

export const getPostQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().min(1, 'Page must be at least 1')),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().min(1, 'Limit must be at least 1')),
  authorId: z.uuid('Author ID must be a valid UUID').optional(),
  visibility: z.enum(Visibility).optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'title'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const postIdSchema = z.object({
  id: z.uuid('Post ID must be a valid UUID'),
});

export const fileUploadSchema = z.object({
  file: z
    .any()
    .refine(
      (file) => {
        if (!file) return false;
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        return validTypes.includes(file.mimetype);
      },
      { message: 'Invalid file type. Only JPEG, PNG, and GIF are allowed.' },
    )
    .refine(
      (file) => {
        if (!file) return false;
        const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
        return file.size <= maxSizeInBytes;
      },
      { message: 'File size exceeds the maximum limit of 5MB' },
    ),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type GetPostQueryInput = z.infer<typeof getPostQuerySchema>;
export type PostIdInput = z.infer<typeof postIdSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
