import { test, expect } from '@playwright/test';

test('navigate to /apps/spotify', async ({ page }) => {
  await page.goto('/apps/spotify');
  await expect(page.getByRole('heading')).toBeVisible();
});
