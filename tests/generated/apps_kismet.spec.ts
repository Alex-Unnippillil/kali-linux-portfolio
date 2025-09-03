import { test, expect } from '@playwright/test';

test('navigate to /apps/kismet', async ({ page }) => {
  await page.goto('/apps/kismet');
  await expect(page.getByRole('heading')).toBeVisible();
});
