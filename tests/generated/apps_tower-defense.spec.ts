import { test, expect } from '@playwright/test';

test('navigate to /apps/tower-defense', async ({ page }) => {
  await page.goto('/apps/tower-defense');
  await expect(page.getByRole('heading')).toBeVisible();
});
