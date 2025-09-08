import { test, expect } from '@playwright/test';

// Test that the web app manifest is present and contains required fields
test('manifest is installable', async ({ page }) => {
  await page.goto('/');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifest = await page.evaluate(async (href) => {
    const res = await fetch(href!);
    return res.json();
  }, manifestHref);
  expect(manifest.name).toBeTruthy();
  expect(manifest.display).toBe('standalone');
});

// Service worker should register when running in production
test.describe('service worker', () => {
  test.skip(process.env.NODE_ENV !== 'production', 'Service worker only available in production');

  test('registers service worker', async ({ page }) => {
    await page.goto('/');
    const active = await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      return navigator.serviceWorker.controller !== null;
    });
    expect(active).toBe(true);
  });
});

// Update banner should appear when a new service worker is available
test.describe('update banner', () => {
  test.skip(process.env.NODE_ENV !== 'production', 'Update banner only shown in production');

  test('shows update banner when service worker updates', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.dispatchEvent(
          new MessageEvent('message', { data: { type: 'SKIP_WAITING' } }),
        );
      }
    });
    const banner = page.locator('[aria-label="update banner"], text=/update available/i');
    await expect(banner).toBeVisible();
  });
});

