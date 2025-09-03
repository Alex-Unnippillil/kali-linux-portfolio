import { test, expect } from '@playwright/test';

test('navigate to /security-education', async ({ page }) => {
  await page.goto('/security-education');
  await expect(page.getByRole('heading')).toBeVisible();
});
