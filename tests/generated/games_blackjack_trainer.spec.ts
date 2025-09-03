import { test, expect } from '@playwright/test';

test('navigate to /games/blackjack/trainer', async ({ page }) => {
  await page.goto('/games/blackjack/trainer');
  await expect(page.getByRole('heading')).toBeVisible();
});
