process.env.NODE_ENV = 'test';
process.env.TEST_TYPE = 'integration';

import request from 'supertest';
import app from '../../app';
import prisma from '../../config/prismaClient';

// Create mock function inside the factory
jest.mock('../../services/email.service.ts', () => {
  const mockSendVerificationEmail = jest.fn().mockResolvedValue(undefined);
  return {
    EmailService: jest.fn().mockImplementation(() => ({
      sendVerificationEmail: mockSendVerificationEmail,
    })),
    // Export the mock so we can access it in tests
    __mockSendVerificationEmail: mockSendVerificationEmail,
    __esModule: true,
  };
});

// Get the mock function
const { __mockSendVerificationEmail: mockSendVerificationEmail } =
  jest.requireMock('../../services/email.service.ts');

describe('Auth Controller - Integration', () => {
  const userData = {
    firstname: 'Aliev',
    lastname: 'Kamal',
    email: 'aliev.kamal@example.com',
    username: 'alievkamal123',
    password: 'Password123!',
    bio: 'Software Developer',
  };

  beforeAll(async () => {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection test:', result);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({});
    // Clear the mock calls between tests
    mockSendVerificationEmail.mockClear();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Verify response structure
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Registered Successfully');

      // Verify user data in response
      expect(res.body.data.user).toMatchObject({
        username: userData.username,
        email: userData.email,
        firstname: userData.firstname,
        lastname: userData.lastname,
      });

      // Verify accessToken exists
      expect(res.body.data.accessToken).toBeDefined();

      // Verify email service was called correctly
      expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        userData.email,
        expect.any(String), // verification token
      );

      // Verify user was created in database
      const userInDb = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(userInDb).not.toBeNull();
      expect(userInDb?.username).toBe(userData.username);
      expect(userInDb?.email).toBe(userData.email);
      expect(userInDb?.emailVerificationToken).toBeDefined();
    });
  });

  describe('POST /api/v1/auth//verify-email', () => {
    it('should verify user email successfully', async () => {
      // First, register the user
      await request(app).post('/api/v1/auth/register').send(userData);

      // Get the user from the database to retrieve the verification token
      const userInDb = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(userInDb).not.toBeNull();
      const verificationToken = userInDb!.emailVerificationToken;

      // Now, verify the email
      const res = await request(app)
        .get('/api/v1/auth/verify-email')
        .query({ token: verificationToken })
        .expect(200);

      // Verify response structure
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Email has been verified successfully');

      // Verify that the user's email is marked as verified in the database
      const updatedUserInDb = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(updatedUserInDb).not.toBeNull();
      expect(updatedUserInDb?.isEmailVerified).toBe(true);
      expect(updatedUserInDb?.emailVerificationToken).toBeNull();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login a user successfully', async () => {
      // First, register the user
      await request(app).post('/api/v1/auth/register').send(userData);

      const userInDb = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(userInDb).not.toBeNull();
      const verificationToken = userInDb!.emailVerificationToken;

      await request(app)
        .get('/api/v1/auth/verify-email')
        .query({
          token: verificationToken,
        })
        .expect(200);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: userData.email,
          password: userData.password,
        })
        .expect(200);

      // Verify response structure
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login Successful');

      // Verify accessToken exists
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data.user).not.toHaveProperty('refreshTokenHash');
    });

    it('should not login unverified user', async () => {
      await request(app).post('/api/v1/auth/register').send(userData);
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: userData.email,
          password: userData.password,
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email not verified');
    });
    it('should reject login for non-existent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should not login with incorrect password', async () => {
      // First, register the user
      await request(app).post('/api/v1/auth/register').send(userData);

      const userInDb = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(userInDb).not.toBeNull();
      const verificationToken = userInDb!.emailVerificationToken;

      await request(app)
        .get('/api/v1/auth/verify-email')
        .query({
          token: verificationToken,
        })
        .expect(200);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: userData.email,
          password: 'WrongPassword!',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should login with username successfully', async () => {
      // First, register the user
      await request(app).post('/api/v1/auth/register').send(userData);

      const userInDb = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(userInDb).not.toBeNull();
      const verificationToken = userInDb!.emailVerificationToken;

      await request(app)
        .get('/api/v1/auth/verify-email')
        .query({
          token: verificationToken,
        })
        .expect(200);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: userData.username,
          password: userData.password,
        })
        .expect(200);

      // Verify response structure
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login Successful');

      // Verify accessToken exists
      expect(res.body.data.accessToken).toBeDefined();
    });
  });
  describe('Validation Errors', () => {
    it('should return validation error for invalid registration data', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstname: '',
          lastname: 'Kamal',
          email: 'not-an-email',
          username: 'alievkamal123',
          password: 'short',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });
});
