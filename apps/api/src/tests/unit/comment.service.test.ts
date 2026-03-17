// src/tests/unit/comment.service.test.ts
import { CommentService } from '../../services/comment.service';
import { Visibility } from '@prisma/client';
import { prismaMock } from '../../config/__mocks__/prismaClient';

describe('CommentService', () => {
  let commentService: CommentService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser123',
    firstname: 'Test',
    lastname: 'User',
    profilePicture: null,
  };

  const mockPost = {
    id: 'post-1',
    title: 'Test Post',
    content: 'Post content',
    authorId: 'user-1',
    visibility: Visibility.PUBLIC,
    deletedAt: null,
  };

  const mockComment = {
    id: 'comment-1',
    postId: 'post-1',
    content: 'This is a test comment',
    imageUrl: null,
    visibility: Visibility.PUBLIC,
    authorId: 'user-1',
    parentCommentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    author: mockUser,
    replies: [],
    _count: {
      replies: 0,
    },
  };

  beforeEach(() => {
    commentService = new CommentService(prismaMock);
    jest.clearAllMocks();
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const createData = {
        postId: 'post-1',
        content: 'This is a comment',
        imageUrl: undefined,
        parentCommentId: undefined,
        visibility: Visibility.PUBLIC,
      };

      prismaMock.post.findUnique.mockResolvedValue(mockPost as any);
      prismaMock.comment.create.mockResolvedValue(mockComment as any);

      const result = await commentService.createComment(
        mockUser.id,
        createData,
      );

      expect(prismaMock.post.findUnique).toHaveBeenCalledWith({
        where: { id: createData.postId, deletedAt: null },
      });

      expect(prismaMock.comment.create).toHaveBeenCalledWith({
        data: {
          content: createData.content,
          imageUrl: undefined,
          visibility: createData.visibility,
          parentCommentId: undefined,
          authorId: 'user-1',
          postId: createData.postId,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstname: true,
              lastname: true,
              profilePicture: true,
            },
          },
          replies: true,
        },
      });

      expect(result).toEqual(mockComment);
    });
  });
});
