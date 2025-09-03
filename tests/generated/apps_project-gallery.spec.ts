import { test, expect } from '@playwright/test';

test('navigate to /apps/project-gallery', async ({ page }) => {
  await page.goto('/apps/project-gallery');
  await expect(page.getByRole('heading')).toBeVisible();
});
