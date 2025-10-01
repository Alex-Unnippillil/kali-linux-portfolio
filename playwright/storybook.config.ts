import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.STORYBOOK_BASE_URL ?? 'http://127.0.0.1:6006';

export default defineConfig({
  testDir: './storybook',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: devices['Desktop Chrome'],
    },
  ],
});
