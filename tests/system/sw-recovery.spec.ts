import { test, expect } from '@playwright/test';

// Ensures users can recover from a stale service worker by clearing caches
// via the Power settings UI.
test.describe('Service worker recovery', () => {
  test('clears app caches and reloads', async ({ page }) => {
    await page.goto('/apps/power');

    await page.evaluate(async () => {
      await caches.open('KLP_stale-cache');
      await caches.open('unrelated-cache');
    });

    let keys = await page.evaluate<string[]>(() => caches.keys());
    expect(keys).toContain('KLP_stale-cache');
    expect(keys).toContain('unrelated-cache');

    await Promise.all([
      page.waitForNavigation(),
      page.getByRole('button', { name: /reload/i }).click(),
    ]);

    keys = await page.evaluate<string[]>(() => caches.keys());
    expect(keys).not.toContain('KLP_stale-cache');
    expect(keys).toContain('unrelated-cache');
  });
});
