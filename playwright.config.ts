import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  testIgnore: ['**/__tests__/**'],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    launchOptions: {
      args: ['--enable-precise-memory-info'],
    },
  },
});
