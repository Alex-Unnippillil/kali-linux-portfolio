import { ReporterDescription, defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? '3000';
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;

const reporters: ReporterDescription[] = [
  ['line'],
  ['html', { outputFolder: 'playwright-report', open: 'never' }],
];

if (process.env.GITHUB_ACTIONS) {
  reporters.push(['github']);
}

export default defineConfig({
  testDir: './playwright',
  fullyParallel: true,
  timeout: 90_000,
  snapshotDir: './playwright/__snapshots__',
  snapshotPathTemplate:
    '{snapshotDir}/{testFileDir}/{projectName}/{testName}-{arg}{ext}',
  outputDir: './playwright/test-results',
  expect: {
    toMatchSnapshot: {
      threshold: 0.15,
      maxDiffPixelRatio: 0.01,
    },
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixelRatio: 0.02,
    },
  },
  reporter: reporters,
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'desktop-default',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
      },
    },
    {
      name: 'desktop-neon',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'mobile-pixel',
      use: {
        ...devices['Pixel 7'],
        colorScheme: 'dark',
      },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `yarn dev --hostname 0.0.0.0 --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 180_000,
      },
});
