import { test, expect } from '@playwright/test';

test('navigate to /apps/metasploit-post', async ({ page }) => {
  await page.goto('/apps/metasploit-post');
  await expect(page.getByRole('heading')).toBeVisible();
});
