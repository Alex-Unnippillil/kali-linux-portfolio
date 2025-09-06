import { test, expect } from '@playwright/test';

test.describe('Pi Imager page', () => {
  test('shows step-by-step instructions', async ({ page }) => {
    await page.goto('/pi-imager');
    await expect(page.getByText(/step-by-step instructions/i)).toBeVisible();
  });

  test('mentions advanced menu unsupported', async ({ page }) => {
    await page.goto('/pi-imager');
    await expect(page.getByText(/advanced menu.*not supported/i)).toBeVisible();
  });
});
