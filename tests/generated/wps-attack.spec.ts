import { test, expect } from '@playwright/test';

test('navigate to /wps-attack', async ({ page }) => {
  await page.goto('/wps-attack');
  await expect(page.getByRole('heading')).toBeVisible();
});
