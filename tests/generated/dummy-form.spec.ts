import { test, expect } from '@playwright/test';

test('navigate to /dummy-form', async ({ page }) => {
  await page.goto('/dummy-form');
  await expect(page.getByRole('heading')).toBeVisible();
});
