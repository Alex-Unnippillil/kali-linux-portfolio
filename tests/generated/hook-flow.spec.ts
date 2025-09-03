import { test, expect } from '@playwright/test';

test('navigate to /hook-flow', async ({ page }) => {
  await page.goto('/hook-flow');
  await expect(page.getByRole('heading')).toBeVisible();
});
