import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.(ts|js)/,
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        launchOptions: {
          args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'],
        },
      },
    },
  ],
});
