import type { Config } from '@jest/types';

import nextJest from 'next/jest';

import coveragePackages from './coverage-packages.json';

const createJestConfig = nextJest({ dir: './' });

type CoverageThreshold = NonNullable<Config.InitialOptions['coverageThreshold']>;

const coverageThreshold = coveragePackages.reduce<CoverageThreshold>(
  (acc, pkg) => {
    const key = `./${pkg.directory.replace(/\\/g, '/')}/`;
    acc[key] = { branches: pkg.threshold, lines: pkg.threshold };
    return acc;
  },
  { global: { branches: 0, lines: 0 } },
);

const collectCoverageFrom = coveragePackages.flatMap(pkg =>
  pkg.extensions.map(
    extension => `<rootDir>/${pkg.directory.replace(/\\/g, '/')}/**/*.${extension}`,
  ),
);

const customJestConfig: Config.InitialOptions = {
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
  coverageThreshold,
  collectCoverageFrom,
  coverageReporters: ['text', 'lcov', 'json-summary'],
};

export default createJestConfig(customJestConfig);
