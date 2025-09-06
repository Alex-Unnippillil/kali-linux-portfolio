import { test, expect } from '@playwright/test';

test('PWA manifest and service worker availability', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  const hasServiceWorker = await page.evaluate(() => 'serviceWorker' in navigator);
  expect(hasServiceWorker).toBe(true);
});
