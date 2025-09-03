import { test, expect } from '@playwright/test';

test('navigate to /apps/figlet', async ({ page }) => {
  await page.goto('/apps/figlet');
  await expect(page.getByRole('heading')).toBeVisible();
});
