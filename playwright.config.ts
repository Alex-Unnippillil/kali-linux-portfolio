import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/**/*.spec.ts', 'playwright/**/*.spec.ts'],
  use: {
    baseURL,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile-360x640',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 360, height: 640 },
      },
    },
    {
      name: 'mobile-414x896',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 414, height: 896 },
      },
    },
  ],
});
