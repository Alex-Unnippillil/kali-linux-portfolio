import { test, expect } from '@playwright/test';

test('about-clone page shows disclaimer and helpful links', async ({ page }) => {
  await page.goto('/about-clone');

  await expect(page.getByText(/visual simulation/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /verify downloads/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /get kali/i })).toBeVisible();
});
