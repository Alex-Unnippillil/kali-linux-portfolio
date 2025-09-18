import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: /.*\.spec\.ts/,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  projects: [
    {
      name: 'pages',
      testDir: './tests',
    },
    {
      name: 'ssh-simulator',
      testDir: './playwright/tests',
      testMatch: /ssh-simulator\.spec\.ts/,
    },
  ],
});
