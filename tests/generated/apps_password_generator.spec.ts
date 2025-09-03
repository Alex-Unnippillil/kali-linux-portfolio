import { test, expect } from '@playwright/test';

test('navigate to /apps/password_generator', async ({ page }) => {
  await page.goto('/apps/password_generator');
  await expect(page.getByRole('heading')).toBeVisible();
});
