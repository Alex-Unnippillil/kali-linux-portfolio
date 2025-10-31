import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: '.',
  outputDir: 'playwright-results',
  reporter: isCI
    ? [
        ['github'],
        ['line'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'playwright-report/report.json' }],
      ]
    : [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [
    {
      name: 'app-smoke',
      testDir: './tests',
      testMatch: /.*\.spec\.ts/,
    },
    {
      name: 'accessibility',
      testDir: './playwright',
      testMatch: /a11y\.spec\.ts/,
    },
    {
      name: 'insights',
      testDir: './playwright',
      testMatch: /speed-insights\.spec\.ts/,
    },
  ],
});

