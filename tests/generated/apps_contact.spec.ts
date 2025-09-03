import { test, expect } from '@playwright/test';

test('navigate to /apps/contact', async ({ page }) => {
  await page.goto('/apps/contact');
  await expect(page.getByRole('heading')).toBeVisible();
});
