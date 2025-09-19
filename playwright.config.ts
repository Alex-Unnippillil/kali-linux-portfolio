import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === '1';
const globalSetup = './playwright/global-setup.ts';

export default defineConfig({
  globalSetup,
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  use: {
    baseURL,
  },
  webServer: skipWebServer
    ? undefined
    : {
        command:
          'yarn typecheck && yarn qa:desktop-shell:lint && yarn build && yarn start --hostname 127.0.0.1 --port 3000',
        url: baseURL,
        reuseExistingServer: true,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 300 * 1000,
      },
});
