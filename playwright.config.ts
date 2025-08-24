// @ts-ignore
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'node node_modules/next/dist/cli/next-dev.js',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
});
