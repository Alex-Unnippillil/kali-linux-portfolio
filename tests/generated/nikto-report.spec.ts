import { test, expect } from '@playwright/test';

test('navigate to /nikto-report', async ({ page }) => {
  await page.goto('/nikto-report');
  await expect(page.getByRole('heading')).toBeVisible();
});
