import { test, expect, Page } from '@playwright/test';

const waitForServiceWorker = async (page: Page) => {
  await page.waitForFunction(() => {
    if (!('serviceWorker' in navigator)) {
      return true;
    }
    return navigator.serviceWorker.ready.then(() => true);
  });
};

test.describe('offline desktop shell', () => {
  test('boots the desktop UI when offline', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForSelector('#status-bar', { timeout: 60000 });
    await expect(page.locator('#status-bar')).toBeVisible();

    await waitForServiceWorker(page);
    await page.waitForTimeout(1000);

    await context.setOffline(true);

    try {
      await page.reload();
      await page.waitForSelector('#status-bar', { timeout: 60000 });
      await expect(page.locator('#status-bar')).toBeVisible();
      await expect(page.locator('text=Offline')).toHaveCount(0);
    } finally {
      await context.setOffline(false);
    }
  });
});
