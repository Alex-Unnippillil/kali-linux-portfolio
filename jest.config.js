const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const esmModules = ['unified', 'remark-parse', 'remark-gfm', 'remark-rehype', 'rehype-stringify'];

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@xterm/xterm/css/xterm.css$': '<rootDir>/__mocks__/styleMock.js',
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/playwright/',
    '<rootDir>/__tests__/playwright/',
    '<rootDir>/tests/',
  ],
  transformIgnorePatterns: [`/node_modules/(?!(${esmModules.join('|')})/)`],
};

module.exports = createJestConfig(customJestConfig);
