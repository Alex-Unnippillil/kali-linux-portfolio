import { test, expect } from '@playwright/test';

test.describe('Content Security Policy', () => {
  test('injects nonce and applies theme script', async ({ page, request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    const header = response.headers()['content-security-policy'] ?? response.headers()['content-security-policy-report-only'];
    expect(header, 'CSP header missing').toBeTruthy();
    expect(header).toContain("script-src 'self'");
    expect(header).toContain('trusted-types app-html dompurify');

    await page.goto('/');
    const nonce = await page.evaluate(() => document.documentElement.dataset.cspNonce);
    expect(nonce).toBeTruthy();

    const themeNonce = await page.locator('script[src="/theme.js"]').getAttribute('nonce');
    expect(themeNonce).toBe(nonce);

    const themeApplied = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(themeApplied).toBeTruthy();
  });

  test('trusted types helpers are available', async ({ page }) => {
    await page.goto('/');
    const hasPolicy = await page.evaluate(() => {
      return typeof window.__appCreateTrustedHTML === 'function';
    });
    expect(hasPolicy).toBe(true);
  });
});
