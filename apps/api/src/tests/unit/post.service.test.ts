import { PostService, PostError } from '../../services/post.service';
import { prismaMock } from '../../config/__mocks__/prismaClient';
import { Visibility } from '@prisma/client';

describe('PostService', () => {
  let postService: PostService;

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
    content: 'This is a test post',
    imageUrl: null,
    authorId: 'user-1',
    visibility: Visibility.PUBLIC,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    author: mockUser,
    _count: {
      likes: 5,
      comments: 3,
    },
  };

  beforeEach(() => {
    postService = new PostService(prismaMock);
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      const createData = {
        title: 'Test Post',
        content: 'This is a test post',
        visibility: Visibility.PUBLIC,
      };

      prismaMock.post.create.mockResolvedValue(mockPost);

      const result = await postService.createPost(mockUser.id, createData);
      expect(result).toEqual(mockPost);
      expect(prismaMock.post.create).toHaveBeenCalledWith({
        data: {
          title: createData.title,
          content: createData.content,
          imageUrl: undefined,
          visibility: createData.visibility,
          author: {
            connect: { id: mockUser.id },
          },
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
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      });
    });
  });

  describe('getPostById', () => {
    it('should get public post without authentication', async () => {
      prismaMock.post.findUnique.mockResolvedValue(mockPost);
      const result = await postService.getPostById(mockPost.id);

      expect(result).toEqual(mockPost);
    });

    it('should throw error for a non-existent post', async () => {
      prismaMock.post.findUnique.mockResolvedValue(null);

      await expect(postService.getPostById('non-existent')).rejects.toThrow(
        new PostError(
          'Error in Getting Post by Id',
          'ERROR_IN_GETTING_POST_BY_ID',
          500,
        ),
      );
    });

    it('should deny access to private post for non-author', async () => {
      const privatePost = {
        ...mockPost,
        visibility: Visibility.PRIVATE,
      };

      prismaMock.post.findUnique.mockResolvedValue(privatePost);

      await expect(
        postService.getPostById(mockPost.id, 'different-user'),
      ).rejects.toThrow(
        new PostError(
          'Error in Getting Post by Id',
          'ERROR_IN_GETTING_POST_BY_ID',
          500,
        ),
      );
    });
  });
});
