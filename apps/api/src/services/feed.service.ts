import { FeedItem } from '../schema/feed.schema';
import { PrismaClient, Visibility, FriendshipStatus } from '@prisma/client';
import { FeedResponse } from '../types/feed.types';

export class FeedError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'FeedError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class FeedService {
  constructor(private prisma: PrismaClient) {}

  async getUserFeed(userId: string, cursor?: string, limit: number = 10) {
    // Get list of friends with ACCEPTED status
    const friends = await this.prisma.friendShip.findMany({
      where: {
        OR: [
          { requesterId: userId, status: FriendshipStatus.ACCEPTED },
          { receiverId: userId, status: FriendshipStatus.ACCEPTED },
        ],
      },
    });

    const friendIds = friends.map((friend) =>
      friend.requesterId === userId ? friend.receiverId : friend.requesterId,
    );

    // Building Visibility Conditions

    const VisibilityConditions = {
      OR: [
        { visibility: Visibility.PUBLIC },
        {
          AND: [
            { visibility: Visibility.FRIENDSONLY },
            { authorId: { in: friendIds } },
          ],
        },
        {
          AND: [{ visibility: Visibility.PRIVATE }, { authorId: userId }],
        },
      ],
    };

    // Main Feed Query

    const posts = await this.prisma.post.findMany({
      where: {
        ...VisibilityConditions,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        likes: true,
        comments: true,
      },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    return posts.map((post) => ({
      ...post,
      likeCount: post.likes.length,
      commentCount: post.comments.length,
    }));
  }
}
