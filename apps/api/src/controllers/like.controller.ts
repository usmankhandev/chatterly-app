import { LikeService, LikeError } from '../services/like.service';
import { Request, Response } from 'express';
import { createLikeSchema, deleteLikeSchema } from '../schema/like.schema';
import prisma from '../config/prismaClient';

const likeService = new LikeService(prisma);

export class LikeController {
  static async createLike(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.user as any).id;
      const validateData = createLikeSchema.parse(req.body);
      const like = await likeService.createLike(userId, validateData);
      res
        .status(201)
        .json({ success: true, message: 'Like created successfully', like });
    } catch (error) {
      if (error instanceof LikeError) {
        res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
      }
    }
  }

  // Delete a like

  static async deleteLike(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.user as any).id;
      const validatedData = deleteLikeSchema.parse(req.params);
      const response = await likeService.deleteLike(userId, validatedData);
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof LikeError) {
        res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
      }
    }
  }
}
