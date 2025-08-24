import { test, expect } from '@playwright/test';

test('open Firefox app from desktop', async ({ page }) => {
  await page.goto('/');
  const firefoxIcon = page.getByRole('img', { name: 'Kali Firefox' });
  await firefoxIcon.dblclick();
  await expect(page.locator('[data-testid="window-chrome"]')).toBeVisible();
});
