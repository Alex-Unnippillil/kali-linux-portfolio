import { test, expect } from '@playwright/test';

test('request builder page loads', async ({ page }) => {
  await page.goto('/apps/request-builder');
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
});

