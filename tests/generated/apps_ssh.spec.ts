import { test, expect } from '@playwright/test';

test('navigate to /apps/ssh', async ({ page }) => {
  await page.goto('/apps/ssh');
  await expect(page.getByRole('heading')).toBeVisible();
});
