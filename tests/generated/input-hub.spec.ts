import { test, expect } from '@playwright/test';

test('navigate to /input-hub', async ({ page }) => {
  await page.goto('/input-hub');
  await expect(page.getByRole('heading')).toBeVisible();
});
