import { expect, test } from '@playwright/test';

const topAppLabels = [
  'Firefox',
  'Terminal',
  'Visual Studio Code',
  'X',
  'Spotify',
  'YouTube',
] as const;

test.describe('top app offline support', () => {
  test('desktop shell stays interactive after going offline', async ({ context, page }) => {
    await context.setOffline(false);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.waitForFunction(() => {
      if (!('serviceWorker' in navigator)) {
        return false;
      }

      return navigator.serviceWorker.ready.then((registration) => Boolean(registration && registration.active));
    });

    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

    await context.setOffline(true);

    await expect(page.locator('#desktop')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();

    for (const label of topAppLabels) {
      await expect(page.locator(`button[aria-label="${label}"]`).first()).toBeVisible();
    }

    await context.setOffline(false);
  });
});
