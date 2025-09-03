import { test, expect } from '@playwright/test';

test('navigate to /keyboard-reference', async ({ page }) => {
  await page.goto('/keyboard-reference');
  await expect(page.getByRole('heading')).toBeVisible();
});
