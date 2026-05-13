import { Request, Response } from 'express';
import { CommentService, CommentError } from '../services/comment.service';
import { CommentResponse } from '../types/comment.types';
import prisma from '../config/prismaClient';
import {
  createCommentSchema,
  updateCommentSchema,
} from '../schema/comment.schema';
import { ZodError } from 'zod';

const commentService = new CommentService(prisma);

export class CommentController {
  static async createComment(req: Request, res: Response): Promise<void> {
    try {
      const { content, imageUrl, postId } = req.body;

      const userId = req.user?.id || (req.user as any).id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }
      const validatedData = createCommentSchema.parse(req.body);
      const comment = await commentService.createComment(userId, validatedData);

      res.status(201).json({
        success: true,
        message: 'Comment created successfully',
        data: { comment },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.issues,
        });
        return;
      }

      if (error instanceof CommentError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
        return;
      }

      console.error('Error while creating comment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
      });
    }
  }

  // get comments of a post

  static async getComments(req: Request, res: Response): Promise<void> {
    try {
      const query = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
      };
      const rawPostId = Array.isArray(req.query.postId)
        ? req.query.postId[0]
        : req.query.postId;
      const postId = typeof rawPostId === 'string' ? rawPostId : undefined;

      if (!postId) {
        res.status(400).json({
          success: false,
          message: 'postId is required',
        });
        return;
      }

      const comments = await commentService.getCommentsByPostId(postId);
      res.status(200).json({
        success: true,
        message: 'Comments fetched successfully',
        data: comments,
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
      });
    }
  }

  // Delete comment

  static async deleteComment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.user as any)?.id;
      const commentId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!userId)
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });

      const result = await commentService.deleteComment(commentId, userId);
      res.status(200).json({
        success: true,
        message: 'Comment deleted successfully',
        data: result,
      });
    } catch (error) {
      if (error instanceof CommentError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
        return;
      }

      console.error('Error deleting comment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
      });
    }
  }
}
