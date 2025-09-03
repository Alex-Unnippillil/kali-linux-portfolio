import { test, expect } from '@playwright/test';

test('navigate to /apps/metasploit', async ({ page }) => {
  await page.goto('/apps/metasploit');
  await expect(page.getByRole('heading')).toBeVisible();
});
