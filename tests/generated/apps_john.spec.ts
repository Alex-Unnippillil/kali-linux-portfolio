import { test, expect } from '@playwright/test';

test('navigate to /apps/john', async ({ page }) => {
  await page.goto('/apps/john');
  await expect(page.getByRole('heading')).toBeVisible();
});
