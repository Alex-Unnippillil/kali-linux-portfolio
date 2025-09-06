import { test, expect } from '@playwright/test';

test('home page sets CSP header', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response?.headers() || {};
  expect(headers['content-security-policy']).toBeTruthy();
});
