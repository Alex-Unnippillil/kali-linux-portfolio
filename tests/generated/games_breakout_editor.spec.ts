import { test, expect } from '@playwright/test';

test('navigate to /games/breakout/editor', async ({ page }) => {
  await page.goto('/games/breakout/editor');
  await expect(page.getByRole('heading')).toBeVisible();
});
