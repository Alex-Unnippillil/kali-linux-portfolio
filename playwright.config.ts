import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;
const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const startCommand = 'yarn start --hostname 0.0.0.0 --port 3000';
const launchCommand = isCI ? startCommand : `yarn build && ${startCommand}`;

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  timeout: 120 * 1000,
  use: {
    baseURL,
    actionTimeout: 120 * 1000,
    navigationTimeout: 120 * 1000,
  },
  webServer: {
    command: launchCommand,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: isCI ? 5 * 60 * 1000 : 10 * 60 * 1000,
  },
});
