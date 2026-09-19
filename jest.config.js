module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'experiments/dataset/**/service.ts',
    'packages/**/*.ts',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
};
