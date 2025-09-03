import { test, expect } from '@playwright/test';

test('navigate to /hydra-preview', async ({ page }) => {
  await page.goto('/hydra-preview');
  await expect(page.getByRole('heading')).toBeVisible();
});
