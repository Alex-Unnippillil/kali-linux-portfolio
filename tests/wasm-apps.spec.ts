import { expect, Page, test } from '@playwright/test';
import { promises as fs } from 'fs';

type WasmAppSpec = {
  name: string;
  path: string;
  waitForReady: (page: Page) => Promise<void>;
};

const wasmApps: WasmAppSpec[] = [
  {
    name: 'Ghidra',
    path: '/apps/ghidra',
    waitForReady: async (page) => {
      await page.waitForLoadState('networkidle');
      const searchInput = page.getByPlaceholder('Search symbols');
      if ((await searchInput.count()) > 0) {
        await expect(searchInput).toBeVisible({ timeout: 30000 });
      } else {
        await expect(page.getByAltText(/Ghidra screenshot/i).first()).toBeVisible({
          timeout: 30000,
        });
      }
    },
  },
  {
    name: 'Wireshark',
    path: '/apps/wireshark',
    waitForReady: async (page) => {
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('button', { name: /legend/i })).toBeVisible({
        timeout: 30000,
      });
      await expect(
        page.locator('input[type="file"][accept=".pcap,.pcapng"]')
      ).toBeVisible({
        timeout: 30000,
      });
      await expect(page.getByRole('link', { name: 'Sample sources' })).toBeVisible({
        timeout: 30000,
      });
    },
  },
];

test.describe('WASM-powered applications', () => {
  test.describe.configure({ timeout: 120_000 });
  for (const app of wasmApps) {
    test(`${app.name} initializes without console warnings`, async ({ page }) => {
      const allConsole: { type: string; text: string }[] = [];
      const consoleIssues: { type: string; text: string }[] = [];
      const pageErrors: string[] = [];

      page.on('console', (message) => {
        const entry = { type: message.type(), text: message.text() };
        allConsole.push(entry);
        if (entry.type === 'warning' || entry.type === 'error') {
          consoleIssues.push(entry);
        }
      });

      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
        allConsole.push({ type: 'pageerror', text: error.message });
      });

      let readyError: unknown;
      try {
        await page.goto(app.path, { waitUntil: 'networkidle' });
        await app.waitForReady(page);
      } catch (error) {
        readyError = error;
      }

      try {
        const screenshotPath = test.info().outputPath(
          `${app.name.toLowerCase()}-screenshot.png`,
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
        await test.info().attach(`${app.name} screenshot`, {
          path: screenshotPath,
          contentType: 'image/png',
        });
      } catch (error) {
        const errorPath = test.info().outputPath(
          `${app.name.toLowerCase()}-screenshot-error.txt`,
        );
        await fs.writeFile(errorPath, String(error));
        await test.info().attach(`${app.name} screenshot error`, {
          path: errorPath,
          contentType: 'text/plain',
        });
      }

      const consolePath = test.info().outputPath(`${app.name.toLowerCase()}-console.json`);
      await fs.writeFile(consolePath, JSON.stringify(allConsole, null, 2));
      await test.info().attach(`${app.name} console`, {
        path: consolePath,
        contentType: 'application/json',
      });

      if (readyError) {
        throw readyError;
      }

      expect(pageErrors, `Unexpected page errors: ${pageErrors.join('; ')}`).toEqual([]);
      expect(
        consoleIssues,
        `Console warnings or errors encountered: ${JSON.stringify(consoleIssues)}`,
      ).toEqual([]);
    });
  }
});
