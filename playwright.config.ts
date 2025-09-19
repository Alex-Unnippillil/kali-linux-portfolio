import { defineConfig } from '@playwright/test';

const port = process.env.PORT || '3000';
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  outputDir: 'test-results',
  use: {
    baseURL,
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `yarn start -p ${port} -H 0.0.0.0`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
