import {
  FriendShipResponse,
  FriendShipPayload,
} from '../types/friendship.types';

import {
  RequestFriendShipInput,
  CancelFriendShipInput,
  RespondFriendShipInput,
} from '../schema/friendship.schema';

import { PrismaClient, FriendshipStatus } from '@prisma/client';
import { NotificationService } from './notification.service';

export class FriendShipError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'FriendShipError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class FriendshipService {
  private notificationService: NotificationService;
  constructor(private prisma: PrismaClient) {
    this.notificationService = new NotificationService(prisma);
  }

  // Additional methods for friendship management can be added here

  async sendFriendRequest(
    userId: string,
    data: RequestFriendShipInput,
  ): Promise<FriendShipPayload> {
    const { receiverId, status } = data;
    try {
      // Check if the receiver exists
      const receiver = await this.prisma.user.findUnique({
        where: {
          id: receiverId,
        },
      });

      if (!receiver)
        throw new FriendShipError(
          'Receiver not found',
          'RECEIVER_NOT_FOUND',
          404,
        );

      // Create the friend request
      const friendship = await this.prisma.friendShip.create({
        data: {
          requesterId: userId,
          status: status || FriendshipStatus.PENDING,
          receiverId,
        },
      });
      // Trigger Notification
      await this.notificationService.notifyFriendRequest(receiverId, userId);

      return {
        requesterId: friendship.requesterId,
        receiverId: friendship.receiverId,
        status: friendship.status as
          | 'PENDING'
          | 'ACCEPTED'
          | 'REJECTED'
          | 'CANCELLED',
      };
    } catch (error) {
      if (error instanceof FriendShipError) {
        throw error;
      }
      throw error;
    }
  }

  //  Respond to a friend request

  async respondToFriendRequest(
    userId: string,
    data: RespondFriendShipInput,
  ): Promise<FriendShipPayload> {
    const { requesterId, status } = data;
    try {
      // Find the existing friend request
      const friendship = await this.prisma.friendShip.findFirst({
        where: {
          requesterId: requesterId,
          receiverId: userId,
          status: FriendshipStatus.PENDING,
        },
      });

      if (!friendship)
        throw new FriendShipError(
          'Friend request not found',
          'FRIEND_REQUEST_NOT_FOUND',
          404,
        );

      // Update the friend request status
      const updatedFriendship = await this.prisma.friendShip.update({
        where: {
          id: friendship.id,
        },
        data: {
          status: status,
        },
      });

      return {
        requesterId: updatedFriendship.requesterId,
        receiverId: updatedFriendship.receiverId,
        status: updatedFriendship.status as
          | 'PENDING'
          | 'ACCEPTED'
          | 'REJECTED'
          | 'CANCELLED',
      };
    } catch (error) {
      if (error instanceof FriendShipError) {
        throw error;
      }
      throw error;
    }
  }

  // Cancel a sent friend request

  async cancelFriendRequest(
    userId: string,
    data: CancelFriendShipInput,
  ): Promise<FriendShipResponse> {
    const { receiverId } = data;
    try {
      // Find the existing friend request
      const friendship = await this.prisma.friendShip.findFirst({
        where: {
          requesterId: userId,
          receiverId: receiverId,
          status: FriendshipStatus.PENDING,
        },
      });

      if (!friendship)
        throw new FriendShipError(
          'Friend request not found',
          'FRIEND_REQUEST_NOT_FOUND',
          404,
        );

      // Delete the friend request
      await this.prisma.friendShip.delete({
        where: {
          id: friendship.id,
        },
      });

      return {
        id: friendship.id,
        requesterId: friendship.requesterId,
        receiverId: friendship.receiverId,
        status: friendship.status as
          | 'PENDING'
          | 'ACCEPTED'
          | 'REJECTED'
          | 'CANCELLED',
        createdAt: friendship.createdAt,
        updatedAt: friendship.updatedAt,
      };
    } catch (error) {
      if (error instanceof FriendShipError) {
        throw error;
      }
      throw error;
    }
  }

  // Accept Friend Request

  async acceptFriendRequest(requestId: string, userId: string) {
    // ... existing validation code ...

    const friendRequest = await this.prisma.friendShip.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });

    // ✅ TRIGGER NOTIFICATION
    await this.notificationService.notifyFriendRequestAcceptance(
      friendRequest.requesterId,
      userId,
    );

    return friendRequest;
  }
}
