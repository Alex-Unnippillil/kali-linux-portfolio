import { test, expect } from '@playwright/test';

test('navigate to /apps/weather_widget', async ({ page }) => {
  await page.goto('/apps/weather_widget');
  await expect(page.getByRole('heading')).toBeVisible();
});
