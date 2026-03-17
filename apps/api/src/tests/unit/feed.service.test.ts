// src/tests/unit/feed.service.test.ts

import { FeedService } from '../../services/feed.service';
import { prismaMock } from '../../config/__mocks__/prismaClient';
import { Visibility, FriendshipStatus, UserStatus } from '@prisma/client';

describe('FeedService - getUserFeed', () => {
  let feedService: FeedService;
  const userId = 'user_1';

  const friendships = [
    {
      id: 'f1',
      requesterId: 'user_1',
      receiverId: 'user_2',
      status: FriendshipStatus.ACCEPTED,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'f2',
      requesterId: 'user_3',
      receiverId: 'user_1',
      status: FriendshipStatus.ACCEPTED,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockPosts = [
    {
      id: 'post1',
      title: 'Hello',
      content: 'Post by user_1',
      imageUrl: null,
      authorId: 'user_1',
      visibility: Visibility.PUBLIC,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      author: {
        id: 'user_1',
        username: 'user1',
        profilePicture: null,
      },
      likes: [],
      comments: [],
    },
    {
      id: 'post2',
      title: 'World',
      content: 'Post by friend',
      imageUrl: null,
      authorId: 'user_2',
      visibility: Visibility.FRIENDSONLY,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      author: {
        id: 'user_2',
        username: 'user2',
        profilePicture: null,
      },
      likes: [],
      comments: [],
    },
  ];

  beforeEach(() => {
    feedService = new FeedService(prismaMock);
    jest.clearAllMocks();

    prismaMock.friendShip.findMany.mockResolvedValue(friendships);
    prismaMock.post.findMany.mockResolvedValue(mockPosts);
  });

  it('should fetch feed posts based on friends + self + visibility', async () => {
    const result = await feedService.getUserFeed(userId);

    // ✅ Verify friendships query
    expect(prismaMock.friendShip.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { requesterId: userId, status: FriendshipStatus.ACCEPTED },
          { receiverId: userId, status: FriendshipStatus.ACCEPTED },
        ],
      },
    });

    // ✅ Verify posts query matches your actual service implementation
    expect(prismaMock.post.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { visibility: Visibility.PUBLIC },
          {
            AND: [
              { visibility: Visibility.FRIENDSONLY },
              { authorId: { in: ['user_2', 'user_3'] } }, // friendIds extracted from friendships
            ],
          },
          {
            AND: [{ visibility: Visibility.PRIVATE }, { authorId: userId }],
          },
        ],
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
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
      take: 10,
    });

    // ✅ Verify results
    expect(result.length).toBe(2);
    expect(result[0].authorId).toBe('user_1');
    expect(result[1].authorId).toBe('user_2');

    // ✅ Verify transformed response includes counts
    expect(result[0]).toHaveProperty('likeCount');
    expect(result[0]).toHaveProperty('commentCount');
  });

  it('should return empty feed when no posts are available', async () => {
    prismaMock.post.findMany.mockResolvedValue([]);

    const result = await feedService.getUserFeed(userId);

    expect(result).toEqual([]);
  });

  it('should return empty feed when user has no friends', async () => {
    prismaMock.friendShip.findMany.mockResolvedValue([]);
    prismaMock.post.findMany.mockResolvedValue([]);

    const result = await feedService.getUserFeed(userId);

    // ✅ Should still query with empty friendIds
    expect(prismaMock.post.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { visibility: Visibility.PUBLIC },
          {
            AND: [
              { visibility: Visibility.FRIENDSONLY },
              { authorId: { in: [] } }, // Empty friendIds
            ],
          },
          {
            AND: [{ visibility: Visibility.PRIVATE }, { authorId: userId }],
          },
        ],
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
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
      take: 10,
    });

    expect(result).toEqual([]);
  });

  it('should handle pagination with cursor', async () => {
    const cursor = 'post_cursor_123';

    await feedService.getUserFeed(userId, cursor, 5);

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        cursor: { id: cursor },
        skip: 1,
      }),
    );
  });

  it('should apply custom limit', async () => {
    await feedService.getUserFeed(userId, undefined, 20);

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
      }),
    );
  });

  it('should correctly calculate like and comment counts', async () => {
    const postsWithInteractions = [
      {
        id: 'post1',
        title: 'Test',
        content: 'Content',
        imageUrl: null,
        authorId: 'user_1',
        visibility: Visibility.PUBLIC,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        author: { id: 'user_1', username: 'user1', profilePicture: null },
        likes: [{ id: 'like1' }, { id: 'like2' }, { id: 'like3' }],
        comments: [{ id: 'comment1' }, { id: 'comment2' }],
      },
    ];

    prismaMock.post.findMany.mockResolvedValue(postsWithInteractions as any);

    const result = await feedService.getUserFeed(userId);

    expect(result[0].likeCount).toBe(3);
    expect(result[0].commentCount).toBe(2);
  });
});
