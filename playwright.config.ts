import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  projects: [
    {
      name: 'app-smoke',
      testDir: './tests',
    },
    {
      name: 'playwright-suite',
      testDir: './playwright',
    },
  ],
});
