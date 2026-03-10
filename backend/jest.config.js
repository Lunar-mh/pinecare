module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/docs/**'],
  coverageThreshold: {
    global: {
      branches: 22,
      functions: 30,
      lines: 38,
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
