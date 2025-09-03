import { test, expect } from '@playwright/test';

test('navigate to /ui/settings/theme', async ({ page }) => {
  await page.goto('/ui/settings/theme');
  await expect(page.getByRole('heading')).toBeVisible();
});
