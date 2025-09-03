import { test, expect } from '@playwright/test';

test('navigate to /apps/simon', async ({ page }) => {
  await page.goto('/apps/simon');
  await expect(page.getByRole('heading')).toBeVisible();
});
