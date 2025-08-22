import { test, expect } from '@playwright/test';

test('loads password generator', async ({ page }) => {
  await page.goto('http://localhost:3000/apps/password_generator');
  await expect(page.locator('body')).toBeVisible();
});
