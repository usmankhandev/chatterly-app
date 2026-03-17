import { z } from 'zod';

export const NotificationTypeEnum = z.enum([
  'POST_COMMENT',
  'FRIEND_REQUEST',
  'FRIEND_ACCEPT',
  'REPLY_COMMENT',
  'MENTION',
  'POST_LIKE',
  'COMMENT_LIKE',
]);

export const EntityTypeEnum = z.enum(['POST', 'COMMENT', 'USER']);

export const createNotificationSchema = z.object({
  userId: z.cuid('Invalid user ID'),
  actorId: z.cuid('Invalid actor ID'),
  type: NotificationTypeEnum,
  entityType: EntityTypeEnum.optional(),
  entityId: z.string().optional(),
  metaData: z.record(z.string(), z.any()).optional(),
});

export const getNotificationsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(50)),
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const notificationSchema = z.object({
  id: z.cuid('Invalid notification ID'),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type GetNotificationsQueryInput = z.infer<
  typeof getNotificationsQuerySchema
>;
export type NotificationInput = z.infer<typeof notificationSchema>;
