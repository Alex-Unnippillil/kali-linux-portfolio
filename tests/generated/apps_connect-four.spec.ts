import { test, expect } from '@playwright/test';

test('navigate to /apps/connect-four', async ({ page }) => {
  await page.goto('/apps/connect-four');
  await expect(page.getByRole('heading')).toBeVisible();
});
