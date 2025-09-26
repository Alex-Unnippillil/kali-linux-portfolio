import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  webServer: {
    command: 'yarn dev --hostname 127.0.0.1 --port 3000',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  use: {
    baseURL,
  },
});
