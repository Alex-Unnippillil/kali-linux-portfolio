import { test, expect } from '@playwright/test';

test('navigate to /recon/graph', async ({ page }) => {
  await page.goto('/recon/graph');
  await expect(page.getByRole('heading')).toBeVisible();
});
