import { test, expect } from '@playwright/test';

test('navigate to /daily-quote', async ({ page }) => {
  await page.goto('/daily-quote');
  await expect(page.getByRole('heading')).toBeVisible();
});
