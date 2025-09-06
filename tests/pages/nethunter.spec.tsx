import { test, expect } from '@playwright/test';

test.describe('NetHunter page', () => {
  test('shows edition cards and app store link', async ({ page }) => {
    await page.goto('/nethunter');

    await expect(page.getByText('Rootless')).toBeVisible();
    await expect(page.getByText('Lite')).toBeVisible();
    await expect(page.getByText('Full')).toBeVisible();

    await expect(
      page.getByRole('link', { name: /app store/i })
    ).toBeVisible();
  });
});
