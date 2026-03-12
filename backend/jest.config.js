'use strict';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
process.env.RUNTIME_MODE = process.env.RUNTIME_MODE || 'COMPETITION_SANDBOX';
process.env.COMPETITION_SANDBOX = process.env.COMPETITION_SANDBOX || '1';
process.env.PRODUCTION_LIVE = process.env.PRODUCTION_LIVE || '0';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/docs/**'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 60,
      functions: 80,
      lines: 80,
    },
  },
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
  },
  coverageDirectory: 'coverage',
  verbose: true,
};
