import { PrismaClient, Comment } from '@prisma/client';
import {
  CreateCommentInput,
  UpdateCommentInput,
} from '../schema/comment.schema';

import { CommentResponse } from '../types/comment.types';
import { NotificationService } from './notification.service';

export class CommentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'CommentError';
  }
}

export class CommentService {
  private notificationService: NotificationService;
  constructor(private prisma: PrismaClient) {
    this.notificationService = new NotificationService(prisma);
  }

  // Add a new comment
  async createComment(
    authorId: string,
    data: CreateCommentInput,
  ): Promise<Comment> {
    const { postId, content, imageUrl, parentCommentId, visibility } = data;
    try {
      // verify post exists

      const post = await this.prisma.post.findUnique({
        where: { id: postId, deletedAt: null },
      });
      if (!post)
        throw new CommentError('Post not found', 'POST_NOT_FOUND', 404);

      // Verify parent comment exists if parentCommentId is provided
      if (parentCommentId) {
        const parentComment = await this.prisma.comment.findUnique({
          where: { id: parentCommentId, deletedAt: null },
        });
        if (!parentComment)
          throw new CommentError(
            'Parent comment not found',
            'PARENT_COMMENT_NOT_FOUND',
            404,
          );
      }

      // Create the Comment

      const comment = await this.prisma.comment.create({
        data: {
          content,
          postId,
          authorId,
          imageUrl,
          parentCommentId,
          visibility,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstname: true,
              lastname: true,
              profilePicture: true,
            },
          },
          post: { select: { authorId: true } },
          parentComment: { select: { authorId: true } },
          replies: true,
        },
      });

      // ✅ TRIGGER NOTIFICATIONS

      // Notify post author about comment
      if (comment.post && comment.post.authorId !== authorId) {
        await this.notificationService.notifyPostComment(
          comment.post.authorId,
          authorId,
          data.postId,
          comment.id,
        );
      }

      // Notify parent comment author about reply
      if (comment.parentCommentId && comment.parentComment) {
        if (comment.parentComment.authorId !== authorId) {
          await this.notificationService.notifyCommentReply(
            comment.parentComment.authorId,
            authorId,
            comment.parentCommentId,
            comment.id,
          );
        }
      }

      return comment;
    } catch (error) {
      console.error('Failed to create comment:', error);
      if (error instanceof CommentError) throw error;
      throw new CommentError(
        'Error in creating comment',
        'COMMENT_NOT_CREATED',
        500,
      );
    }
  }

  // Fetch comments for a post with pagination

  async getCommentsByPostId(postId: string): Promise<Comment[]> {
    try {
      const comments = await this.prisma.comment.findMany({
        where: { postId, deletedAt: null },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstname: true,
              lastname: true,
              profilePicture: true,
            },
          },
          replies: {
            where: { deletedAt: null },
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  firstname: true,
                  lastname: true,
                  profilePicture: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return comments;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw new CommentError(
        'Failed to fetch comments',
        'COMMENT_FETCH_ERROR',
        500,
      );
    }
  }

  // Update a comment

  async updateComment(
    authorId: string,
    data: UpdateCommentInput,
    commentId: string,
  ): Promise<CommentResponse> {
    try {
      const existingComment = await this.prisma.comment.findUnique({
        where: {
          id: commentId,
          deletedAt: null,
        },
      });
      if (!existingComment)
        throw new CommentError('Comment not found', 'COMMENT_NOT_FOUND', 404);
      if (existingComment.authorId !== authorId)
        throw new CommentError(
          'Unauthorized to update this comment',
          'COMMENT_UNAUTHORIZED',
          403,
        );

      await this.prisma.comment.update({
        where: { id: commentId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          author: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              username: true,
              profilePicture: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Comment updated successfully',
      };
    } catch (error) {
      console.error('Error updating comment:', error);
      if (error instanceof CommentError) throw error;
      throw new CommentError(
        'Failed to update comment',
        'COMMENT_UPDATE_ERROR',
        500,
      );
    }
  }

  // Delete a comment

  async deleteComment(
    commentId: string,
    authorId: string,
  ): Promise<CommentResponse> {
    try {
      const existingComment = await this.prisma.comment.findUnique({
        where: { id: commentId, deletedAt: null },
      });
      if (!existingComment)
        throw new CommentError('Comment not found', 'COMMENT_NOT_FOUND', 404);
      if (existingComment.authorId !== authorId)
        throw new CommentError(
          'Unauthorized to delete this comment',
          'COMMENT_UNAUTHORIZED',
          403,
        );
      await this.prisma.comment.update({
        where: {
          id: commentId,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      return {
        success: true,
        message: 'Comment deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw new CommentError(
        'Failed to delete comment',
        'COMMENT_DELETION_ERROR',
        500,
      );
    }
  }
}
