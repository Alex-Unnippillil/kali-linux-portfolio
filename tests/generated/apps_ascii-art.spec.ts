import { test, expect } from '@playwright/test';

test('navigate to /apps/ascii-art', async ({ page }) => {
  await page.goto('/apps/ascii-art');
  await expect(page.getByRole('heading')).toBeVisible();
});
