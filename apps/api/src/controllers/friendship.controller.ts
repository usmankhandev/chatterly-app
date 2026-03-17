import { Request, Response } from 'express';
import { FriendshipService } from '../services/friendship.service';
import { FriendShipPayload } from '../types/friendship.types';
import prisma from '../config/prismaClient';
import { requestFriendShipSchema } from '../schema/friendship.schema';
import { ZodError } from 'zod';

const friendshipService = new FriendshipService(prisma);

export class FriendshipController {
  static async sendFriendRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.user as any).id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const validatedData = requestFriendShipSchema.parse(req.body);
      const friendship: FriendShipPayload =
        await friendshipService.sendFriendRequest(userId, validatedData);

      res.status(201).json({
        success: true,
        message: 'Friend request sent successfully',
        data: { friendship },
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

      console.error('Error while sending friend request:', error);
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
      });
    }
  }
}
