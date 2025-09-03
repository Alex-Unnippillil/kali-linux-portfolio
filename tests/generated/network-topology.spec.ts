import { test, expect } from '@playwright/test';

test('navigate to /network-topology', async ({ page }) => {
  await page.goto('/network-topology');
  await expect(page.getByRole('heading')).toBeVisible();
});
