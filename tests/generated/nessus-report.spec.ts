import { test, expect } from '@playwright/test';

test('navigate to /nessus-report', async ({ page }) => {
  await page.goto('/nessus-report');
  await expect(page.getByRole('heading')).toBeVisible();
});
