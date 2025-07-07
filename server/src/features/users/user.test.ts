jest.mock('../../config/prismaClient');

import { UserService } from './user.service';
import { describe, it, expect } from '@jest/globals';
import prisma from '../../config/prismaClient';

describe('User Service', () => {
  const mockInput = {
    name: 'name',
    email: 'usman@example.com',
    password: 'securePass123',
  };

  // Create User
  it('should create a user successfully', async () => {
    const fakeUser = { id: 'abc123', ...mockInput };
    (prisma.user.create as jest.Mock).mockResolvedValue(fakeUser);
    const result = await UserService.createUser(mockInput);
    expect(result).toHaveProperty('id', 'abc123');
    expect(result.email).toBe(mockInput.email);
  });

  // List Users;

  it('it should list all users', async () => {
    const fakeUsers = [
      { id: '1', name: 'John' },
      { id: '2', name: 'Alice' },
    ];
    (prisma.user.findMany as jest.Mock).mockResolvedValue(fakeUsers);
    const result = await UserService.getAllUsers();
    expect(result).toHaveLength(2);
  });
});
