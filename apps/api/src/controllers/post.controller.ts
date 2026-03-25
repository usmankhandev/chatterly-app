import { Request, Response } from 'express';
import { PostService, PostError } from '../services/post.service';
import prisma from '../config/prismaClient';
import { createPostSchema } from '../schema/post.schema';
import { ZodError } from 'zod';

const postService = new PostService(prisma);

export class PostController {
  static async createPost(req: Request, res: Response): Promise<void> {
    try {
      const { title, content, visibility } = req.body;
      const userId = req.user?.id || (req.user as any)?.id;
      console.log('🔍 userId:', userId);
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const validatedData = createPostSchema.parse(req.body);
      const post = await postService.createPost(userId, validatedData);

      res.status(201).json({
        success: true,
        message: 'Post Created Successfully',
        data: { post },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation Failed',
          errors: error.issues,
        });
        return;
      }
      console.log('Create Post Error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}
