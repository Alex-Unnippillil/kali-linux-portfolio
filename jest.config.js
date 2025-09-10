const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@xterm/xterm/css/xterm.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  testPathIgnorePatterns: [
    '<rootDir>/playwright/',
    '<rootDir>/__tests__/playwright/',
    '<rootDir>/__tests__/legacy/',
    '<rootDir>/tests/',
  ],
};

module.exports = createJestConfig(customJestConfig);
