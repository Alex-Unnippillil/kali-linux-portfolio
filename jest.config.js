const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@xterm/xterm/css/xterm.css$': '<rootDir>/__mocks__/styleMock.js',
    '^@/(.*)$': '<rootDir>/$1',
    '^react-ga4$': '<rootDir>/__mocks__/react-ga4.js',
  },
    testPathIgnorePatterns: [
      '<rootDir>/playwright/',
      '<rootDir>/__tests__/playwright/',
      '<rootDir>/tests/apps.smoke.spec.ts',
    ],
};

module.exports = createJestConfig(customJestConfig);
