import { z } from 'zod';
import { LikeType } from '@prisma/client';

export const createLikeSchema = z
  .object({
    postId: z.string().uuid('Post ID must be a valid UUID').optional(),
    commentId: z.string().uuid('Comment ID must be a valid UUID').optional(),
    // FIX 1: Use nativeEnum, FIX 2: Rename to likeType
    likeType: z.nativeEnum(LikeType).optional(),
  })
  .refine((data) => data.postId || data.commentId, {
    message: 'Either postId or commentId must be provided',
  })
  .refine((data) => !(data.postId && data.commentId), {
    message: 'Cannot like both post and comment at the same time',
  });

export const deleteLikeSchema = z.object({
  id: z.string().uuid('Like ID must be a valid UUID'),
});

export type CreateLikeInput = z.infer<typeof createLikeSchema>;
export type DeleteLikeInput = z.infer<typeof deleteLikeSchema>;
