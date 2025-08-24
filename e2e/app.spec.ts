import { test, expect } from '@playwright/test';

test('renders CVE dashboard app', async ({ page }) => {
  await page.goto('/apps/cve-dashboard');
  await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
});

test('cve API returns json', async ({ request }) => {
  const res = await request.get('/api/cve?keyword=test');
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data).toHaveProperty('vulnerabilities');
});
