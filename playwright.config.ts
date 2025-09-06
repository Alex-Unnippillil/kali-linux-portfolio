import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.(ts|tsx)/,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
});
