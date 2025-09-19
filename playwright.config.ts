import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  projects: [
    {
      name: 'smoke',
      testDir: './tests',
      testMatch: /.*\.spec\.ts/,
    },
    {
      name: 'desktop-regression',
      testDir: './playwright',
      testMatch: /.*\.spec\.ts/,
    },
  ],
});
