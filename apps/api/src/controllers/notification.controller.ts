/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import prisma from '../config/prismaClient';
import { success, ZodError } from 'zod';
import {
  createNotificationSchema,
  getNotificationsQuerySchema,
  notificationSchema,
} from '../schema/notification.schema';

import {
  NotificationService,
  NotificationError,
} from '../services/notification.service';

const notificationService = new NotificationService(prisma);

export class NotificationController {
  // list paginated notifications
  static async list(req: Request, res: Response) {
    try {
      const userId = (req.user?.id || (req.user as any)?.id) as string;
      const query = getNotificationsQuerySchema.parse(req.query);
      const data = await notificationService.getUserNotifications(
        userId,
        query,
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }
      if (error instanceof NotificationError) {
        res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
        return;
      }
      console.error('NotificationController.list error:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = (req.user?.id || (req.user as any)?.id) as string;
      const count =
        await notificationService.getUnreadNotificationCount(userId);
      res.status(200).json({ success: true, data: { count } });
    } catch (error) {
      console.error('NotificationController.getUnreadCount error:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const payload = createNotificationSchema.parse(req.body);
      const notification =
        await notificationService.createNotification(payload);

      console.log(`Created notification: ${notification}`);
      console.log('Created notification:', notification);
      if (!notification) {
        res.status(200).json({
          success: true,
          message: 'self-notification ignored',
          data: null,
        });
        return;
      }
      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: { notification },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }
      if (error instanceof NotificationError) {
        res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
        return;
      }
      console.error('NotificationController.create error:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = notificationSchema.parse(req.params);
      const userId = (req.user?.id || (req.user as any)?.id) as string;
      const notification = await notificationService.markAsRead(id, userId);
      res.status(200).json({ success: true, data: { notification } });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }
      if (error instanceof NotificationError) {
        res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
        return;
      }
      console.error('NotificationController.markAsRead error:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = (req.user?.id || (req.user as any)?.id) as string;
      const result = await notificationService.markAllAsRead(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      if (error instanceof NotificationError) {
        res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
        return;
      }
      console.error('NotificationController.markAllAsRead error:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = notificationSchema.parse(req.params);
      const userId = (req.user?.id || (req.user as any)?.id) as string;
      const result = await notificationService.deleteNotification(id, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }
      if (error instanceof NotificationError) {
        res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
        return;
      }
      console.error('NotificationController.delete error:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async deleteAll(req: Request, res: Response) {
    try {
      const userId = (req.user?.id || (req.user as any)?.id) as string;
      const result = await notificationService.deleteAllNotifications(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('NotificationController.deleteAll error:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal Server Error' });
    }
  }
}
