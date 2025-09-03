import { test, expect } from '@playwright/test';

test('navigate to /apps/solitaire', async ({ page }) => {
  await page.goto('/apps/solitaire');
  await expect(page.getByRole('heading')).toBeVisible();
});
