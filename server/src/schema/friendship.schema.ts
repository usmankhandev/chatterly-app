import { z } from 'zod';
import { FriendshipStatus } from '@prisma/client';

export const requestFriendShipSchema = z.object({
  receiverId: z.uuid('Receiver ID must be a valid UUID'),
  status: z.enum(FriendshipStatus).optional(),
});

export const cancelFriendShipSchema = z.object({
  receiverId: z.uuid('Receiver ID must be a valid UUID'),
});

export const respondFriendShipSchema = z.object({
  requesterId: z.uuid('Requester ID must be a valid UUID'),
  status: z.enum(FriendshipStatus).optional(),
});

export type RequestFriendShipInput = z.infer<typeof requestFriendShipSchema>;
export type CancelFriendShipInput = z.infer<typeof cancelFriendShipSchema>;
export type RespondFriendShipInput = z.infer<typeof respondFriendShipSchema>;
