const userMock = {
  create: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const prisma = {
  user: userMock,
};

export default prisma;
