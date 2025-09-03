import { test, expect } from '@playwright/test';

test('navigate to /sekurlsa_logonpasswords', async ({ page }) => {
  await page.goto('/sekurlsa_logonpasswords');
  await expect(page.getByRole('heading')).toBeVisible();
});
