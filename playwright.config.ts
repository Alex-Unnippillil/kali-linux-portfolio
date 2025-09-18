import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /(?:^|\/)(?:tests|playwright)\/.*\.spec\.ts$/,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
});
