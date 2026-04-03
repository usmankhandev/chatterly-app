import request from 'supertest';
import { app } from '../../app';
import prisma from '../../config/prismaClient';
import { Visibility } from '@prisma/client';
import { PasswordUtils, TokenUtils } from '../../utils/shared/auth.utils';

const mockUser = {
  id: 'user-1',
  username: 'testuser123',
  firstname: 'Test',
  lastname: 'User',
  email: 'testuser@example.com',
  password: 'Password123!',
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

let userId: string;
let authToken: string;

describe('Post Controller - Integration Test', () => {
  describe('POST /api/v1/posts/create', () => {
    beforeAll(async () => {
      await prisma.$connect();
    });

    beforeEach(async () => {
      // create and verify a user for testing

      const hashedPassword = await PasswordUtils.hashPassword(
        mockUser.password,
      );

      const user = await prisma.user.create({
        data: {
          firstname: mockUser.firstname,
          lastname: mockUser.lastname,
          email: mockUser.email,
          username: mockUser.username,
          passwordHash: hashedPassword.hash,
          passwordSalt: hashedPassword.salt,
          isEmailVerified: true,
          accountStatus: 'ACTIVE',
          jwtVersion: 0,
          loginAttempts: 0,
          mfaEnabled: false,
          mfaMethods: [],
        },
      });

      userId = user.id;

      // Generate JWT Token

      authToken = TokenUtils.generateAccessToken(
        user.id,
        user.jwtVersion,
        user.email,
      );
    });

    afterEach(async () => {
      await prisma.post.deleteMany();
      await prisma.user.deleteMany();
    });

    afterAll(async () => {
      await prisma.post.deleteMany();
      await prisma.$disconnect();
    });

    it('should create a post successfully', async () => {
      const res = await request(app)
        .post('/api/v1/posts/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Post',
          content: 'This is a test post',
          visibility: Visibility.PUBLIC,
        })
        .expect(201);

      // Verify response structure
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Post Created Successfully');

      const postInDb = await prisma.post.findFirst({
        where: { id: res.body.id, title: 'Test Post', authorId: userId },
      });
      expect(postInDb).not.toBeNull();
      expect(postInDb?.visibility).toBe(Visibility.PUBLIC);
      expect(postInDb?.authorId).toBe(userId);
    }, 30000);
  });
});
