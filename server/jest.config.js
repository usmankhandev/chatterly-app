import createDefaultPreset from 'ts-jest';

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  roots: ['<rootDir>/src'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
};
