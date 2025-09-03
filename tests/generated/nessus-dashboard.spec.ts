import { test, expect } from '@playwright/test';

test('navigate to /nessus-dashboard', async ({ page }) => {
  await page.goto('/nessus-dashboard');
  await expect(page.getByRole('heading')).toBeVisible();
});
