import { z } from 'zod';
import { Visibility } from '@prisma/client';

export const createCommentSchema = z.object({
  postId: z.string().uuid('Post ID must be a valid UUID'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),
  imageUrl: z.url('Must be a valid URL').optional().or(z.literal('')),
  parentCommentId: z.uuid('Parent Comment ID must be a valid UUID').optional(),
  visibility: z.enum(Visibility).optional().default(Visibility.PUBLIC),
});
export const getCommentSchema = z.object({
  postId: z.uuid('Post ID must be a valid UUID'),
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
});

export const deleteCommentSchema = z.object({
  id: z.uuid('Comment ID must be a valid UUID'),
});

export const commentIdSchema = z.object({
  id: z.uuid('Comment ID must be a valid UUID'),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .max(5000, 'Content must be less than 5000 characters')
    .optional(),
  imageUrl: z.url().optional(),
  visibility: z.enum(Visibility).optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type GetCommentInput = z.infer<typeof getCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
