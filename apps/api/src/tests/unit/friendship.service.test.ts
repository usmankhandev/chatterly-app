import { FriendshipService } from '../../services/friendship.service';
import { prismaMock } from '../../config/__mocks__/prismaClient';
import { RequestFriendShipInput } from '../../schema/friendship.schema';
import { FriendshipStatus } from '@prisma/client';

describe('FriendshipService', () => {
  let friendshipService: FriendshipService;
  const mockUser = {
    id: 'user-1',
    username: 'testuser123',
    firstname: 'Test',
    lastname: 'User',
    email: 'abc@gmail.com',
    profilePicture: null,
  };

  beforeEach(() => {
    friendshipService = new FriendshipService(prismaMock);
    jest.clearAllMocks();
  });

  describe('sendFriendRequest', () => {
    it('should send a friend request successfully', async () => {
      const userId = 'user-1';
      const requestData: RequestFriendShipInput = {
        receiverId: 'user-2',
        status: FriendshipStatus.PENDING,
      };

      const mockFriendship = {
        requesterId: userId,
        receiverId: requestData.receiverId,
        status: requestData.status,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      prismaMock.friendShip.create.mockResolvedValue(mockFriendship as any);

      const result = await friendshipService.sendFriendRequest(
        userId,
        requestData,
      );

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: requestData.receiverId },
      });
      expect(prismaMock.friendShip.create).toHaveBeenCalledWith({
        data: {
          requesterId: userId,
          receiverId: requestData.receiverId,
          status: requestData.status,
        },
      });
      expect(result).toEqual({
        requesterId: userId,
        receiverId: requestData.receiverId,
        status: requestData.status,
      });
    });
  });
});
