import { test, expect } from '@playwright/test';

test('navigate to /popular-modules', async ({ page }) => {
  await page.goto('/popular-modules');
  await expect(page.getByRole('heading')).toBeVisible();
});
