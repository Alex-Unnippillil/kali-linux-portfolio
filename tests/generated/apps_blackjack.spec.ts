import { test, expect } from '@playwright/test';

test('navigate to /apps/blackjack', async ({ page }) => {
  await page.goto('/apps/blackjack');
  await expect(page.getByRole('heading')).toBeVisible();
});
