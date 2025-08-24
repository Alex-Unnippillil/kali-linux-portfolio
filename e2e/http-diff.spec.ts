import { test, expect } from '../playwright.config';

test('renders HTTP diff app', async ({ page }) => {
  await page.goto('/apps/http-diff');
  await expect(page.getByRole('button', { name: 'Compare' })).toBeVisible();
});

test('http-diff API returns json', async ({ request }) => {
  const res = await request.post('/api/http-diff', {
    data: { url1: 'https://example.com', url2: 'https://example.com' },
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data).toHaveProperty('url1');
  expect(data).toHaveProperty('url2');
  expect(data).toHaveProperty('bodyDiff');
});

