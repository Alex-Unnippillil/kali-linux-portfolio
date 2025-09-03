import { test, expect } from '@playwright/test';

test('navigate to /apps/timer_stopwatch', async ({ page }) => {
  await page.goto('/apps/timer_stopwatch');
  await expect(page.getByRole('heading')).toBeVisible();
});
