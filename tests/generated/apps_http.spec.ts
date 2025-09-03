import { test, expect } from '@playwright/test';

test('navigate to /apps/http', async ({ page }) => {
  await page.goto('/apps/http');
  await expect(page.getByRole('heading')).toBeVisible();
});
