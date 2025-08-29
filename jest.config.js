const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@xterm/xterm/css/xterm.css$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(?:xml)(?:\\?raw)?$': '<rootDir>/__mocks__/fileMock.js',
  },
  testPathIgnorePatterns: ['<rootDir>/playwright/'],
};

module.exports = createJestConfig(customJestConfig);
