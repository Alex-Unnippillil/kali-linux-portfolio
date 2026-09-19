import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/portfolio",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 45000,
  reporter: [
    ["list"],
    ["html", { outputFolder: "portfolio-browser-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "yarn start -H 127.0.0.1",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "webkit",
      testMatch:
        /(?:youtube-responsive|app-polish|x-profile|repository-editor)\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "firefox",
      testMatch:
        /(?:youtube-responsive|app-polish|x-profile|repository-editor)\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
  ],
});
