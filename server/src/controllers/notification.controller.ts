import { Request, Response } from 'express';
import { socketServer } from '../socket/socket.server';
import prisma from '../config/prismaClient';

import {
  NotificationService,
  NotificationError,
} from '../services/notification.service';

const notificationService = new NotificationService(prisma);

export class NotificationController {
  static async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.user as any).id;
      const { type, content, recipientId } = req.body;

      const notification =
        await notificationService.createNotification({
          type,
          content,
          recipientId,
          senderId: userId,
        });

      // Emit real-time notification via Socket.io
      socketServer.sendNotificationToUser(
        recipientId,
        await notificationService.getUnreadCount(recipientId),
      );

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        notification,
      });
    } catch (error) {
      if (error instanceof NotificationError) {
        res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
      }
    }
  }     
