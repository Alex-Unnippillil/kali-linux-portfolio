import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'yarn dev --hostname 127.0.0.1 --port 3000';
const useWebServer = !process.env.PLAYWRIGHT_SKIP_WEBSERVER;

export default defineConfig({
  testDir: './playwright/tests',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL,
    headless: true,
  },
  webServer: useWebServer
    ? {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
