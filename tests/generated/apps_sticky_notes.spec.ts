import { test, expect } from '@playwright/test';

test('navigate to /apps/sticky_notes', async ({ page }) => {
  await page.goto('/apps/sticky_notes');
  await expect(page.getByRole('heading')).toBeVisible();
});
