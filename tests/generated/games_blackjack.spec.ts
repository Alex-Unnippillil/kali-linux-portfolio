import { test, expect } from '@playwright/test';

test('navigate to /games/blackjack', async ({ page }) => {
  await page.goto('/games/blackjack');
  await expect(page.getByRole('heading')).toBeVisible();
});
