module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/docs/**'],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 52,
      functions: 70,
      lines: 70,
    },
  },
  testTimeout: 30000,
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
  coverageDirectory: 'coverage',
  verbose: true,
};
