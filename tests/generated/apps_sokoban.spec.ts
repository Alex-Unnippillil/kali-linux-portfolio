import { test, expect } from '@playwright/test';

test('navigate to /apps/sokoban', async ({ page }) => {
  await page.goto('/apps/sokoban');
  await expect(page.getByRole('heading')).toBeVisible();
});
