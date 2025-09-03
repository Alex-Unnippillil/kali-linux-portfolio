import { test, expect } from '@playwright/test';

test('navigate to /apps/word_search', async ({ page }) => {
  await page.goto('/apps/word_search');
  await expect(page.getByRole('heading')).toBeVisible();
});
