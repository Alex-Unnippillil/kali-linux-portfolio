// @ts-ignore
import { defineConfig, test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/*', route => {
      const url = route.request().url();
      if (
        url.startsWith('http://localhost') ||
        url.startsWith('https://localhost') ||
        url.startsWith('http://127.0.0.1') ||
        url.startsWith('https://127.0.0.1')
      ) {
        return route.continue();
      }
      return route.fulfill({ status: 204, body: '' });
    });
    await use(page);
  },
});

export { expect };

export default defineConfig({
  testDir: './',
  testMatch: ['e2e/**/*.spec.ts', '__tests__/e2e/**/*.spec.ts'],
  retries: 2,
  reporter: [['html', { open: 'never' }]],
  webServer: {
    command: 'yarn dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      JWT_SECRET: 'test-secret',
      NODE_ENV: 'test',
    },
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
});
