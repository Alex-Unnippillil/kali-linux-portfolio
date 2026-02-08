import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /(?:^|\/(?:tests|playwright(?:\/tests)?))\/.*\.spec\.ts$/,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
});
