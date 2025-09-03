import { test, expect } from '@playwright/test';

test('navigate to /', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading')).toBeVisible();
});
