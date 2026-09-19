module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/experiments/dataset/**/*.test.ts',
    '<rootDir>/packages/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'experiments/dataset/**/service.ts',
    'packages/**/*.ts',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
};
