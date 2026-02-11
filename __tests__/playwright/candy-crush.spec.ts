import { test, expect } from '@playwright/test';

test('candy crush app opens and board renders', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /applications/i }).click({ timeout: 10000 }).catch(() => {});
  await page.locator('[data-app-id="candy-crush"], [aria-label="Candy Crush"]').first().click({ timeout: 10000 }).catch(() => {});
  await expect(page.locator('[data-cell]').first()).toBeVisible({ timeout: 15000 });
  await page.locator('[data-cell="0-0"]').click();
  await page.locator('[data-cell="0-1"]').click();
});
