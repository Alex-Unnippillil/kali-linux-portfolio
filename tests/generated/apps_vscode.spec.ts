import { test, expect } from '@playwright/test';

test('navigate to /apps/vscode', async ({ page }) => {
  await page.goto('/apps/vscode');
  await expect(page.getByRole('heading')).toBeVisible();
});
