import { test, expect } from '@playwright/test';

test('navigate to /spoofing', async ({ page }) => {
  await page.goto('/spoofing');
  await expect(page.getByRole('heading')).toBeVisible();
});
