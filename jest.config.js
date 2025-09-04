const nextJest = require('next/jest');
const fs = require('fs');
const path = require('path');

const createJestConfig = nextJest({ dir: './' });

const quarantineFile = path.join(__dirname, 'tests', 'quarantine.json');
let quarantinePatterns = [];
if (fs.existsSync(quarantineFile)) {
  try {
    quarantinePatterns = JSON.parse(fs.readFileSync(quarantineFile));
  } catch (error) {
    console.warn('Unable to parse quarantine list', error);
  }
}

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
    ...quarantinePatterns,
  ],
};

module.exports = createJestConfig(customJestConfig);
