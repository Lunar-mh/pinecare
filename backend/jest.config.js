module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/docs/**'],
  coverageThreshold: {
    global: {
      branches: 37,
      functions: 52,
      lines: 54,
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
