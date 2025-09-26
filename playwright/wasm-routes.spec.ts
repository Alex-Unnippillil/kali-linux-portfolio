import { expect, test } from '@playwright/test';

type SmokeRoute = {
  path: string;
  check: (page: import('@playwright/test').Page) => Promise<void>;
};

const routes: SmokeRoute[] = [
  {
    path: '/apps/ghidra',
    check: async (page) => {
      const fallbackImage = page.locator('img[alt="Ghidra screenshot 1"]');
      if ((await fallbackImage.count()) > 0) {
        await expect(fallbackImage).toBeVisible();
        await expect(page.locator('img[alt="Ghidra screenshot 2"]')).toBeVisible();
        return;
      }

      const toggleButton = page.getByRole('button', {
        name: /Use (?:Capstone|Ghidra)/i,
      });
      await expect(toggleButton).toBeVisible();
      await expect(page.getByPlaceholder('Search symbols')).toBeVisible();
    },
  },
  {
    path: '/apps/wireshark',
    check: async (page) => {
      await expect(
        page.getByRole('button', { name: 'Toggle protocol color legend' }),
      ).toBeVisible();
      await expect(page.locator('input[type="file"][accept=".pcap,.pcapng"]')).toBeVisible();
      await expect(page.getByRole('option', { name: 'Open sample' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Sample sources' })).toBeVisible();
    },
  },
];

for (const route of routes) {
  test(`wasm smoke test for ${route.path}`, async ({ baseURL, page }) => {
    const origin = baseURL ?? 'http://localhost:3000';
    await page.goto(new URL(route.path, origin).toString(), {
      waitUntil: 'networkidle',
    });
    await route.check(page);
  });
}
