import { test, expect } from '@playwright/test';

test.describe('notifications', () => {
  test('silences toasts while fullscreen is active', async ({ page }) => {
    await page.goto('/apps/metasploit');

    await page.evaluate(() => {
      if (!window.__KALI_FULLSCREEN_DEBUG__) {
        throw new Error('Fullscreen debug helpers not available');
      }
      window.__KALI_FULLSCREEN_DEBUG__.setFullscreen(true);
    });

    const indicator = page.getByRole('status', {
      name: 'Notifications silenced while fullscreen is active',
    });
    await expect(indicator).toBeVisible();

    await page.getByRole('button', { name: 'Generate' }).click();

    const toast = page.getByRole('status', { name: 'Payload generated' });
    await expect(toast).toHaveCount(0);

    await page.evaluate(() => {
      window.__KALI_FULLSCREEN_DEBUG__?.clear();
    });

    await expect(indicator).toHaveCount(0);

    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(toast).toBeVisible();
  });
});
