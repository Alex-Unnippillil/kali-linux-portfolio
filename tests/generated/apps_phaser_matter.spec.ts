import { test, expect } from '@playwright/test';

test('navigate to /apps/phaser_matter', async ({ page }) => {
  await page.goto('/apps/phaser_matter');
  await expect(page.getByRole('heading')).toBeVisible();
});
