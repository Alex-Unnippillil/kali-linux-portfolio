import { test, expect } from '@playwright/test';

test('navigate to /notes', async ({ page }) => {
  await page.goto('/notes');
  await expect(page.getByRole('heading')).toBeVisible();
});
