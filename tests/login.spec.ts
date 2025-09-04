import { test, expect } from '@playwright/test';

// Verifies Nessus login form handles invalid credentials gracefully
// by displaying an error message.
test('nessus login shows error with invalid credentials', async ({ page }) => {
  await page.goto('/apps/nessus');

  await page.fill('#nessus-url', 'http://invalid');
  await page.fill('#nessus-username', 'user');
  await page.fill('#nessus-password', 'pass');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.locator('#nessus-error')).toBeVisible();
});
