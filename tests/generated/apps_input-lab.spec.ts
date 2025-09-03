import { test, expect } from '@playwright/test';

test('navigate to /apps/input-lab', async ({ page }) => {
  await page.goto('/apps/input-lab');
  await expect(page.getByRole('heading')).toBeVisible();
});
