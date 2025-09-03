import { test, expect } from '@playwright/test';

test('navigate to /apps/beef', async ({ page }) => {
  await page.goto('/apps/beef');
  await expect(page.getByRole('heading')).toBeVisible();
});
