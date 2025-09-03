import { test, expect } from '@playwright/test';

test('navigate to /apps/checkers', async ({ page }) => {
  await page.goto('/apps/checkers');
  await expect(page.getByRole('heading')).toBeVisible();
});
