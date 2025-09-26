import { test, expect } from '@playwright/test';

const waitForServiceWorker = async (page: import('@playwright/test').Page) => {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    const registration = await navigator.serviceWorker.ready;
    return Boolean(registration?.active);
  });

  const hasController = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller));
  if (!hasController) {
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  }
};

test.describe('offline fallback', () => {
  test('shows offline page with retry button when network is unavailable', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForServiceWorker(page);

    await context.setOffline(true);

    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/offline\.html$/);
      await expect(page.getByRole('heading', { name: 'Offline' })).toBeVisible();

      const retryButton = page.getByRole('button', { name: /retry/i });
      await expect(retryButton).toBeVisible();
      await retryButton.click();
      await expect(page.getByRole('heading', { name: 'Offline' })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });
});
