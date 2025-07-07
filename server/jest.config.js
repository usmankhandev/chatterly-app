const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  roots: ['<rootDir>/src'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ["/node_modules/", "/__tests__/"]
};
