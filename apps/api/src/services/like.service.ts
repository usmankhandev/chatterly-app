import { CreateLikeInput, DeleteLikeInput } from '../schema/like.schema';

import { Like, PrismaClient, LikeType } from '@prisma/client';
import { LikeResponse } from '../types/like.types';
import { NotificationService } from './notification.service';

export class LikeError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'LikeError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class LikeService {
  private notificationService: NotificationService;
  constructor(private prisma: PrismaClient) {
    this.notificationService = new NotificationService(prisma);
  }

  // Create a new like
  async createLike(userId: string, data: CreateLikeInput): Promise<Like> {
    const { postId, commentId, likeType } = data;
    try {
      if (postId) {
        const post = await this.prisma.post.findUnique({
          where: {
            id: postId,
            deletedAt: null,
          },
        });
        if (!post) throw new LikeError('Post not found', 'POST_NOT_FOUND', 404);
      }

      if (commentId) {
        const comment = await this.prisma.comment.findUnique({
          where: {
            id: commentId,
            deletedAt: null,
          },
        });
        if (!comment) {
          throw new LikeError('Comment is not found', 'COMMENT_NOT_FOUND', 404);
        }
      }
      // Prevent duplicate likes

      const existingLike = await this.prisma.like.findFirst({
        where: {
          authorId: userId,
          postId: postId || null,
          commentId: commentId || null,
        },
      });
      if (existingLike) {
        throw new LikeError(
          'You have already liked this item',
          'DUPLICATE_LIKE',
          400,
        );
      }

      const like = await this.prisma.like.create({
        data: {
          authorId: userId,
          postId: postId || null,
          commentId: commentId || null,
          likeType: likeType || LikeType.LIKE,
        },
        include: {
          post: { select: { authorId: true } },
          comment: { select: { authorId: true } },
        },
      });

      // ✅ TRIGGER NOTIFICATION
      if (like.postId && like.post) {
        await this.notificationService.notifyPostLike(
          like.post.authorId,
          userId,
          like.postId,
        );
      } else if (like.commentId && like.comment) {
        await this.notificationService.notifyCommentLike(
          like.comment.authorId,
          userId,
          like.commentId,
        );
      }
      return like;
    } catch (error) {
      if (error instanceof LikeError) throw error;
      console.log('Create Like Error:', error);
      throw new LikeError('Failed to create like', 'LIKE_CREATE_ERROR', 500);
    }
  }

  // Delete a like

  async deleteLike(
    userId: string,
    data: DeleteLikeInput,
  ): Promise<LikeResponse> {
    const { id } = data;
    try {
      const like = await this.prisma.like.findUnique({
        where: { id },
      });
      if (!like) {
        throw new LikeError('Like not found', 'LIKE_NOT_FOUND', 404);
      }
      if (like.authorId !== userId) {
        throw new LikeError(
          'You are not authorized to delete this like',
          'UNAUTHORIZED',
          403,
        );
      }
      await this.prisma.like.delete({
        where: { id },
      });
      return {
        success: true,
        message: 'Like deleted successfully',
      };
    } catch (error) {
      if (error instanceof LikeError) throw error;
      console.log('Delete Like Error:', error);
      throw new LikeError('Failed to delete like', 'LIKE_DELETE_ERROR', 500);
    }
  }
}
