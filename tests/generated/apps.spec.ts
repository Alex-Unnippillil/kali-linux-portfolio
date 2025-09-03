import { test, expect } from '@playwright/test';

test('navigate to /apps', async ({ page }) => {
  await page.goto('/apps');
  await expect(page.getByRole('heading')).toBeVisible();
});
