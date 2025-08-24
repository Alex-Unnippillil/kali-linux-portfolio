import { test, expect } from '@playwright/test';

test('PKCE Helper loads', async ({ page }) => {
  await page.goto('/apps/pkce-helper');
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
});
