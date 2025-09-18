import { test, expect } from '@playwright/test';

test.describe('Package Manager install flow', () => {
  test('installs ten packages without surprises', async ({ page }) => {
    const packages = Array.from({ length: 10 }, (_, index) => {
      const id = `package-${index + 1}`;
      return { id, file: `${id}.json` };
    });

    const pageErrors: Error[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.route('**/api/plugins', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(packages),
      });
    });

    await page.route('**/api/plugins/*.json', async (route) => {
      const url = new URL(route.request().url());
      const fileName = url.pathname.split('/').pop() || '';
      const id = fileName.replace(/\.json$/i, '');
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id,
          sandbox: 'worker',
          code: "self.postMessage('install-complete');",
        }),
      });
    });

    await page.goto('/apps/plugin-manager');

    await expect(page.getByRole('heading', { name: 'Plugin Catalog' })).toBeVisible();

    for (const pkg of packages) {
      const row = page.locator('li', { hasText: pkg.id }).first();
      const installButton = row.locator('button').first();
      await installButton.click();
      await expect(installButton).toHaveText('Installed');
      await expect(installButton).toBeDisabled();
      const runButton = row.getByRole('button', { name: 'Run' });
      await expect(runButton).toBeVisible();
      await expect(runButton).toBeEnabled();
    }

    await expect(page.locator('li button:has-text("Installed")')).toHaveCount(packages.length);
    await expect(page.getByRole('button', { name: 'Run' })).toHaveCount(packages.length);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
