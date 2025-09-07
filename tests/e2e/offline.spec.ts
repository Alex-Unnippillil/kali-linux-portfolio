import { test, expect } from '@playwright/test';
import path from 'path';

// Confirm the home page can be loaded while offline after the service worker is ready.
test('serves home page offline', async ({ page }) => {
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  await page.route('**/service-worker.js', route =>
    route.fulfill({ path: swPath, contentType: 'application/javascript' })
  );

  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/service-worker.js');
    await navigator.serviceWorker.ready;
  });

  await page.context().setOffline(true);
  const response = await page.reload();
  expect(response?.status()).toBe(200);
  await expect(page.locator('nav [aria-label="Show Applications"]')).toBeVisible();
});
