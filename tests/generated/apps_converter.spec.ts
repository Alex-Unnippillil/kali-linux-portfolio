import { test, expect } from '@playwright/test';

test('navigate to /apps/converter', async ({ page }) => {
  await page.goto('/apps/converter');
  await expect(page.getByRole('heading')).toBeVisible();
});
