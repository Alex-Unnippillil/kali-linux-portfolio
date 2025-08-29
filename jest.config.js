const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@xterm/xterm/css/xterm.css$': '<rootDir>/__mocks__/styleMock.js',
    '^@/(.*)$': '<rootDir>/$1',
    '^flags$': '<rootDir>/flags',
  },
  testPathIgnorePatterns: ['<rootDir>/playwright/', '<rootDir>/__tests__/playwright/'],
};

module.exports = createJestConfig(customJestConfig);
