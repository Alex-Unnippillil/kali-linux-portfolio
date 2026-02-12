import { expect, test } from '@playwright/test';

test.describe('Update Center workflow', () => {
  test('completes update with offline restart deferral', async ({ context, page }) => {
    await page.goto('/apps/update-center');

    await expect(page.getByRole('heading', { name: 'Update Center' })).toBeVisible();

    await page.getByRole('button', { name: 'Check for updates' }).click();
    await expect(page.getByTestId('update-status')).toContainText('Update');

    await page.getByRole('button', { name: 'Install update' }).click();
    await expect(page.getByTestId('update-status')).toContainText('Restart required');

    await context.setOffline(true);
    await expect.poll(async () => page.evaluate(() => navigator.onLine)).toBeFalsy();

    await page.getByRole('button', { name: 'Restart now' }).click();
    await expect(page.getByTestId('update-status')).toContainText('Restart deferred');

    await context.setOffline(false);
    await expect.poll(async () => page.evaluate(() => navigator.onLine)).toBeTruthy();
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByTestId('update-status')).toContainText('Connection restored');

    await page.getByRole('button', { name: 'Restart now' }).click();
    await expect(page.getByTestId('update-status')).toContainText('Restart complete');
  });
});
