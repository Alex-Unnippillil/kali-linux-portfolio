import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const isCI = !!process.env.CI;
const url = new URL(baseURL);
const port = url.port || '3000';
const serverCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ||
  (isCI ? `yarn start --hostname 0.0.0.0 --port ${port}` : `yarn dev --hostname 0.0.0.0 --port ${port}`);

export default defineConfig({
  testDir: '.',
  testMatch: /(?:tests|playwright)\/.*\.spec\.ts$/,
  use: {
    baseURL,
  },
  webServer: {
    command: serverCommand,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
  },
});
