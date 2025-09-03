import { test, expect } from '@playwright/test';

test('navigate to /apps/mimikatz/offline', async ({ page }) => {
  await page.goto('/apps/mimikatz/offline');
  await expect(page.getByRole('heading')).toBeVisible();
});
