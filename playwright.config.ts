import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
  },
  projects: [
    {
      name: 'smoke',
      testDir: './tests',
      testMatch: /.*\.spec\.ts/,
    },
    {
      name: 'perf',
      testDir: './e2e/perf',
      testMatch: /.*\.spec\.ts/,
    },
  ],
});
