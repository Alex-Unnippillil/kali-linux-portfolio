import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: /.*\.spec\.ts/,
  projects: [
    { name: 'ui-smoke', testDir: './tests' },
    { name: 'desktop-a11y', testDir: './playwright' },
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
});
