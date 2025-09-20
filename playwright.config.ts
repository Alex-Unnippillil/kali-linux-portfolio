import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/**/*.spec.ts', 'playwright/**/*.spec.ts'],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
});
