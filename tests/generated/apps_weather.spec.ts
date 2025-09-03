import { test, expect } from '@playwright/test';

test('navigate to /apps/weather', async ({ page }) => {
  await page.goto('/apps/weather');
  await expect(page.getByRole('heading')).toBeVisible();
});
