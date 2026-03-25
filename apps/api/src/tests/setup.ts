import { prismaMock } from '../config/__mocks__/prismaClient';

const isIntegrationTest =
  process.env.TEST_TYPE === 'integration' ||
  expect.getState().currentTestName?.includes('integration');

if (!isIntegrationTest) {
  jest.mock('../config/prismaClient', () => prismaMock);
}
