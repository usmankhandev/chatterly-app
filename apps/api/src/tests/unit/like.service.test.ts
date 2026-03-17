// src/tests/unit/like.service.test.ts

import { LikeService, LikeError } from '../../services/like.service';
import { LikeType, Visibility } from '@prisma/client';
import { prismaMock } from '../../config/__mocks__/prismaClient';
import type { CreateLikeInput } from '../../schema/like.schema';

describe('LikeService', () => {
  let likeService: LikeService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser123',
    firstname: 'Test',
    lastname: 'User',
    profilePicture: null,
  };

  // FIX 3: Use as any for all mockResolvedValue calls
  const mockPost = {
    id: 'post-1',
    title: 'Test Post',
    content: 'Post content',
    authorId: 'user-2',
    visibility: Visibility.PUBLIC,
    deletedAt: null,
  } as any; // Bypass strict type checking

  const mockComment = {
    id: 'comment-1',
    postId: 'post-1',
    content: 'Test comment',
    visibility: Visibility.PUBLIC,
    authorId: 'user-2',
    parentCommentId: null,
    deletedAt: null,
  } as any;

  const mockLike = {
    id: 'like-1',
    userId: 'user-1',
    postId: 'post-1',
    commentId: null,
    likeType: LikeType.LIKE, // FIX 2: Renamed from liketype
    createdAt: new Date(),
    user: mockUser,
  } as any;

  beforeEach(() => {
    likeService = new LikeService(prismaMock);
    jest.clearAllMocks();
  });

  describe('createLike', () => {
    describe('Like on Post', () => {
      it('should create a like on a post successfully', async () => {
        const createData: CreateLikeInput = {
          postId: 'post-1',
          // likeType is optional, will default to LIKE
        };

        prismaMock.post.findUnique.mockResolvedValue(mockPost);
        prismaMock.like.findFirst.mockResolvedValue(null);
        prismaMock.like.create.mockResolvedValue(mockLike);

        const result = await likeService.createLike(mockUser.id, createData);

        // Verify post lookup
        expect(prismaMock.post.findUnique).toHaveBeenCalledWith({
          where: { id: createData.postId, deletedAt: null },
        });

        // Verify duplicate check
        expect(prismaMock.like.findFirst).toHaveBeenCalledWith({
          where: {
            userId: mockUser.id,
            postId: createData.postId,
            commentId: null,
          },
        });

        // Verify like creation
        expect(prismaMock.like.create).toHaveBeenCalledWith({
          data: {
            userId: mockUser.id,
            postId: createData.postId,
            commentId: undefined,
            likeType: LikeType.LIKE, // FIX 2: Renamed
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstname: true,
                lastname: true,
                profilePicture: true,
              },
            },
          },
        });

        expect(result).toEqual(mockLike);
      });

      it('should create a like with custom type', async () => {
        const createData: CreateLikeInput = {
          postId: 'post-1',
          likeType: LikeType.LOVE, // FIX 2: Renamed
        };

        const loveLike = {
          ...mockLike,
          likeType: LikeType.LOVE, // FIX 2: Renamed
        } as any;

        prismaMock.post.findUnique.mockResolvedValue(mockPost);
        prismaMock.like.findFirst.mockResolvedValue(null);
        prismaMock.like.create.mockResolvedValue(loveLike);

        const result = await likeService.createLike(mockUser.id, createData);

        expect(prismaMock.like.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              likeType: LikeType.LOVE, // FIX 2: Renamed
            }),
          }),
        );

        expect(result.likeType).toBe(LikeType.LOVE); // FIX 2: Renamed
      });

      it('should throw error if post does not exist', async () => {
        const createData: CreateLikeInput = {
          postId: 'non-existent-post',
        };

        prismaMock.post.findUnique.mockResolvedValue(null);

        await expect(
          likeService.createLike(mockUser.id, createData),
        ).rejects.toThrow(
          new LikeError('Post not found', 'POST_NOT_FOUND', 404),
        );

        expect(prismaMock.like.create).not.toHaveBeenCalled();
      });

      it('should throw error if user already liked the post', async () => {
        const createData: CreateLikeInput = {
          postId: 'post-1',
        };

        const existingLike = {
          id: 'existing-like',
          userId: mockUser.id,
          postId: createData.postId,
          commentId: null,
          likeType: LikeType.LIKE, // FIX 2: Renamed
        } as any;

        prismaMock.post.findUnique.mockResolvedValue(mockPost);
        prismaMock.like.findFirst.mockResolvedValue(existingLike);

        await expect(
          likeService.createLike(mockUser.id, createData),
        ).rejects.toThrow(new LikeError('Already liked', 'ALREADY_LIKED', 400));

        expect(prismaMock.like.create).not.toHaveBeenCalled();
      });

      it('should throw error if trying to like private post from another user', async () => {
        const privatePost = {
          ...mockPost,
          visibility: Visibility.PRIVATE,
          authorId: 'different-user',
        } as any;

        const createData: CreateLikeInput = {
          postId: 'post-1',
        };

        prismaMock.post.findUnique.mockResolvedValue(privatePost);

        await expect(
          likeService.createLike(mockUser.id, createData),
        ).rejects.toThrow(
          new LikeError('Cannot like this post', 'LIKE_ACCESS_DENIED', 403),
        );
      });

      it('should allow liking own private post', async () => {
        const ownPrivatePost = {
          ...mockPost,
          visibility: Visibility.PRIVATE,
          authorId: mockUser.id,
        } as any;

        const createData: CreateLikeInput = {
          postId: 'post-1',
        };

        const ownPostLike = {
          ...mockLike,
          postId: createData.postId,
        } as any;

        prismaMock.post.findUnique.mockResolvedValue(ownPrivatePost);
        prismaMock.like.findFirst.mockResolvedValue(null);
        prismaMock.like.create.mockResolvedValue(ownPostLike);

        const result = await likeService.createLike(mockUser.id, createData);

        expect(result).toEqual(ownPostLike);
      });
    });

    describe('Like on Comment', () => {
      it('should create a like on a comment successfully', async () => {
        const createData: CreateLikeInput = {
          commentId: 'comment-1',
        };

        const commentLike = {
          id: 'like-2',
          userId: 'user-1',
          postId: null,
          commentId: 'comment-1',
          likeType: LikeType.LIKE, // FIX 2: Renamed
          createdAt: new Date(),
          user: mockUser,
        } as any;

        prismaMock.comment.findUnique.mockResolvedValue(mockComment);
        prismaMock.like.findFirst.mockResolvedValue(null);
        prismaMock.like.create.mockResolvedValue(commentLike);

        const result = await likeService.createLike(mockUser.id, createData);

        // Verify comment lookup
        expect(prismaMock.comment.findUnique).toHaveBeenCalledWith({
          where: { id: createData.commentId, deletedAt: null },
        });

        // Verify duplicate check
        expect(prismaMock.like.findFirst).toHaveBeenCalledWith({
          where: {
            userId: mockUser.id,
            postId: null,
            commentId: createData.commentId,
          },
        });

        // Verify like creation
        expect(prismaMock.like.create).toHaveBeenCalledWith({
          data: {
            userId: mockUser.id,
            postId: undefined,
            commentId: createData.commentId,
            likeType: LikeType.LIKE, // FIX 2: Renamed
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstname: true,
                lastname: true,
                profilePicture: true,
              },
            },
          },
        });

        expect(result).toEqual(commentLike);
      });

      it('should throw error if comment does not exist', async () => {
        const createData: CreateLikeInput = {
          commentId: 'non-existent-comment',
        };

        prismaMock.comment.findUnique.mockResolvedValue(null);

        await expect(
          likeService.createLike(mockUser.id, createData),
        ).rejects.toThrow(
          new LikeError('Comment not found', 'COMMENT_NOT_FOUND', 404),
        );
      });

      it('should throw error if user already liked the comment', async () => {
        const createData: CreateLikeInput = {
          commentId: 'comment-1',
        };

        const existingLike = {
          id: 'existing-like',
          userId: mockUser.id,
          postId: null,
          commentId: createData.commentId,
          likeType: LikeType.LIKE, // FIX 2: Renamed
        } as any;

        prismaMock.comment.findUnique.mockResolvedValue(mockComment);
        prismaMock.like.findFirst.mockResolvedValue(existingLike);

        await expect(
          likeService.createLike(mockUser.id, createData),
        ).rejects.toThrow(new LikeError('Already liked', 'ALREADY_LIKED', 400));
      });
    });

    describe('Validation', () => {
      it('should throw error if neither postId nor commentId is provided', async () => {
        const createData = {} as CreateLikeInput; // Cast needed for invalid test case

        await expect(
          likeService.createLike(mockUser.id, createData),
        ).rejects.toThrow(
          new LikeError(
            'Must provide either postId or commentId',
            'INVALID_LIKE_TARGET',
            400,
          ),
        );
      });

      it('should throw error if both postId and commentId are provided', async () => {
        const createData = {
          postId: 'post-1',
          commentId: 'comment-1',
        } as CreateLikeInput; // Cast needed for invalid test case

        await expect(
          likeService.createLike(mockUser.id, createData),
        ).rejects.toThrow(
          new LikeError(
            'Cannot like both post and comment simultaneously',
            'INVALID_LIKE_TARGET',
            400,
          ),
        );
      });
    });
  });
});
