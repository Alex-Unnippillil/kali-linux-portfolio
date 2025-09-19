import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';

interface Scenario {
  name: string;
  route: string;
  readySelector: string;
}

const scenarios: Scenario[] = [
  {
    name: 'BLE Sensor',
    route: '/apps/ble-sensor',
    readySelector: 'button:has-text("Scan for Devices")',
  },
  {
    name: 'WebUSB Console',
    route: '/apps/webusb',
    readySelector: 'button:has-text("Connect")',
  },
  {
    name: 'Screen Recorder',
    route: '/apps/screen-recorder',
    readySelector: 'button:has-text("Start Recording")',
  },
];

for (const scenario of scenarios) {
  test.describe(scenario.name, () => {
    test(`${scenario.name} renders without console issues`, async ({ page }) => {
      const consoleEvents: { type: string; text: string }[] = [];
      const pageErrors: string[] = [];

      page.on('console', (message) => {
        consoleEvents.push({ type: message.type(), text: message.text() });
      });

      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });

      await page.goto(scenario.route);
      await expect(page.locator(scenario.readySelector)).toBeVisible();

      const slug = scenario.route.replace(/\//g, '-').replace(/^-/, '');
      const screenshotPath = test.info().outputPath(`${slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await test.info().attach('screenshot', {
        path: screenshotPath,
        contentType: 'image/png',
      });

      const logPath = test.info().outputPath(`${slug}-console.log`);
      const formattedLogs =
        consoleEvents.map((entry) => `[${entry.type}] ${entry.text}`).join('\n') ||
        'No console events captured.';
      await fs.writeFile(logPath, formattedLogs, 'utf8');
      await test.info().attach('console log', {
        path: logPath,
        contentType: 'text/plain',
      });

      const warningsOrErrors = consoleEvents.filter((event) =>
        event.type === 'warning' || event.type === 'error'
      );

      expect(warningsOrErrors, 'Console emitted warnings or errors').toEqual([]);
      expect(pageErrors, 'Unhandled page errors were thrown').toEqual([]);
    });
  });
}
