import { test, expect } from '@playwright/test';

test('kex troubleshooting displays error message after expanding card', async ({ page }) => {
  await page.goto('https://www.kali.org/docs/wsl/win-kex/#troubleshooting');
  await page.locator('summary', { hasText: 'Error connecting to the Win-KeX server' }).click();
  await expect(
    page.locator('text=Error connecting to the Win-KeX server… try kex start')
  ).toBeVisible();
});
