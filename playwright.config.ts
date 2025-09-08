import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Run Playwright specs from both the main tests directory and the
  // standalone `playwright` folder used for lighter integration tests.
  testDir: '.',
  testMatch: /(?:tests|playwright)\/.*\.spec\.(ts|tsx)/,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
    trace: process.env.CI ? 'on' : 'retain-on-failure',
  },
});
