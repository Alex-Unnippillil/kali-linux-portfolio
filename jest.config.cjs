const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@xterm/xterm/css/xterm.css$': '<rootDir>/__mocks__/styleMock.cjs',
  },
  testPathIgnorePatterns: [
    '<rootDir>/playwright/',
    '<rootDir>/__tests__/playwright/',
    '<rootDir>/tests/',
  ],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/__tests__/**/*.test.cjs'],
};

module.exports = createJestConfig(customJestConfig);
