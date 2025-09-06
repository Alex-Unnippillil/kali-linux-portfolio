import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  testMatch: /.*\.spec\.(ts|tsx)/,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
});
