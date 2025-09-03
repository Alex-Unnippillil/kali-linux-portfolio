import { test, expect } from '@playwright/test';

test('navigate to /apps/minesweeper', async ({ page }) => {
  await page.goto('/apps/minesweeper');
  await expect(page.getByRole('heading')).toBeVisible();
});
