import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  projects: [
    {
      name: 'apps-smoke',
      testDir: './tests',
      testMatch: /.*\.spec\.ts/,
    },
    {
      name: 'desktop-e2e',
      testDir: './playwright',
      testMatch: /.*\.spec\.ts/,
    },
  ],
});
