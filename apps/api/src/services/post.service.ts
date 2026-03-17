import { PrismaClient, Prisma, Post, Visibility } from '@prisma/client';
import {
  CreatePostInput,
  UpdatePostInput,
  GetPostQueryInput,
} from '../schema/post.schema';

import { PostResponse } from '../types/post.types';

export class PostError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'PostError';
  }
}

export class PostService {
  constructor(private prisma: PrismaClient) {}

  // create a new post

  async createPost(authorId: string, data: CreatePostInput): Promise<Post> {
    try {
      const post = await this.prisma.post.create({
        data: {
          ...data,
          author: {
            connect: {
              id: authorId,
            },
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
      return post;
    } catch (error) {
      console.error('Failed to create post:', error);
      throw new PostError('Error in creating post', 'POST_NOT_CREATED', 500);
    }
  }

  async updatePost(
    authorId: string,
    data: UpdatePostInput,
    postId: string,
  ): Promise<Post> {
    try {
      const existingPost = await this.prisma.post.findUnique({
        where: {
          id: postId,
          deletedAt: null,
        },
      });

      if (!existingPost)
        throw new PostError('Post not found', 'POST_NOT_FOUND', 404);

      if (existingPost.authorId !== authorId)
        throw new PostError(
          'Unauthorized to update this post',
          'POST_UNAUTHORIZED',
          403,
        );

      const updatePost = await this.prisma.post.update({
        where: { id: postId },
        data: {
          ...data,
          updatedAt: new Date(),
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
      return updatePost;
    } catch (error) {
      console.log('Error while updating post', error);
      throw new PostError(
        'Error while updating post',
        'POST_UPDATE_ERROR',
        500,
      );
    }
  }

  async deletePost(postId: string, authorId: string): Promise<PostResponse> {
    try {
      const existingPost = await this.prisma.post.findUnique({
        where: { id: postId, deletedAt: null },
      });

      if (!existingPost)
        throw new PostError('PostNot found', 'POST_NOT_FOUND', 404);
      if (existingPost.authorId !== authorId)
        throw new PostError(
          'Unauthorized post to delete',
          'POST_UNAUTHORIZED',
          403,
        );
      await this.prisma.post.update({
        where: {
          id: postId,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      return {
        success: true,
        message: 'Post deleted successfully',
      };
    } catch (error) {
      console.log('Error in deleting the post', error);
      throw new PostError(
        'Error in deleting the post',
        'POST_DELETION_UNSUCCESSFUL',
        500,
      );
    }
  }

  async getUserPosts(
    authorId: string,
    query: GetPostQueryInput,
    requesterId: string,
  ) {
    try {
      const isOwnProfile = authorId === requesterId;
      const { page, limit, sortBy, sortOrder } = query;
      const skip = (page - 1) * limit;
      const where: Prisma.PostWhereInput = {
        authorId: authorId,
        deletedAt: null,
      };

      // If not own profile, filter by visibility

      if (!isOwnProfile) {
        where.OR = [{ visibility: Visibility.PUBLIC }];
      }
      const [posts, total] = await Promise.all([
        this.prisma.post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
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
        }),
        this.prisma.post.count({ where }),
      ]);
      return {
        posts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
    } catch (error) {
      console.log('Error in Getting User Posts', error);
      throw new PostError(
        'Error in getting User Posts',
        'GET_USER_POSTS_ERROR',
        500,
      );
    }
  }

  // get posts

  async getPosts(query: GetPostQueryInput, requesterId?: string) {
    try {
      const { page, limit, authorId, visibility, search, sortBy, sortOrder } =
        query;
      const skip = (page - 1) * limit;

      // Build where clause

      const where: Prisma.PostWhereInput = {
        deletedAt: null,
      };

      // filter by author
      if (authorId) {
        where.authorId = authorId;
      }

      if (!authorId || authorId !== requesterId) {
        where.OR = [
          { visibility: Visibility.PUBLIC },
          ...(requesterId ? [{ authorId: requesterId }] : []),
        ];
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Execute query

      const [posts, total] = await Promise.all([
        this.prisma.post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
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
        }),
        this.prisma.post.count({ where }),
      ]);
      return {
        posts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
    } catch (error) {
      console.log('Error in Getting Posts', error);
      throw new PostError('Error in Getting Posts', 'GET_POSTS_ERROR', 500);
    }
  }

  // get post by id

  async getPostById(postId: string, requesterId?: string) {
    try {
      const post = await this.prisma.post.findUnique({
        where: {
          id: postId,
          deletedAt: null,
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

      if (!post) {
        throw new PostError('Post not found', 'POST_NOT_FOUND', 404);
      }

      if (
        post.visibility === Visibility.PRIVATE &&
        post.authorId !== requesterId
      ) {
        throw new PostError('Access Denied', 'POST_ACCESS_DENIED', 403);
      }

      if (
        post.visibility === Visibility.FRIENDSONLY &&
        post.authorId !== requesterId
      ) {
        const areFriends = await this.checkFriendship(
          post.authorId,
          requesterId,
        );
        if (!areFriends)
          throw new PostError('Access Denied', 'POST_ACCESS_DESNIED', 403);
      }
      return post;
    } catch (error) {
      console.log('Error in Getting Post by Id', error);
      throw new PostError(
        'Error in Getting Post by Id',
        'ERROR_IN_GETTING_POST_BY_ID',
        500,
      );
    }
  }

  // get post statistics

  async getPostStats(postId: string) {
    try {
      const post = await this.prisma.post.findUnique({
        where: {
          id: postId,
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      });
      if (!post) throw new PostError('Post not found', 'POST_NOT_FOUND', 404);
      return {
        postId: post.id,
        likes: post._count.likes,
        comments: post._count.comments,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    } catch (error) {
      console.log('Error in finding Post Stats', error);
      throw new PostError(
        'Error in finding Post Stats',
        'ERROR_IN_POST_STATS',
        500,
      );
    }
  }

  private async checkFriendship(
    userId1: string,
    userId2?: string,
  ): Promise<boolean> {
    if (!userId2) return false;
    return false;
  }
}
