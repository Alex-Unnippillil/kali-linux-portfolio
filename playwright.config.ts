import { defineConfig } from '@playwright/test';

import { serverEnv } from './lib/env.server';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  use: {
    baseURL: serverEnv.BASE_URL || 'http://localhost:3000',
  },
});
