const nextJest = require('next/jest');

const baseCustomConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@xterm/xterm/css/xterm.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  testPathIgnorePatterns: [
    '<rootDir>/playwright/',
    '<rootDir>/__tests__/playwright/',
    '<rootDir>/tests/',
  ],
};

const createConfig = (dir = './') => {
  const createJestConfig = nextJest({ dir });
  return createJestConfig(baseCustomConfig);
};

module.exports = {
  baseCustomConfig,
  createConfig,
};
