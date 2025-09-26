import { test, expect } from '@playwright/test';

test.skip(
  process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true',
  'Speed Insights script is disabled during static export',
);

const mode = process.env.PLAYWRIGHT_SERVER_MODE ?? 'development';

if (mode !== 'development' && mode !== 'production') {
  throw new Error(
    `Unsupported PLAYWRIGHT_SERVER_MODE "${mode}". Expected "development" or "production".`,
  );
}

const isProd = mode === 'production';

test(`Speed Insights script ${isProd ? 'loads' : 'stays disabled'} in ${mode}`, async ({
  page,
}) => {
  await page.goto('/');
  const script = page.locator('script[src*="/_vercel/speed-insights/script.js"]');

  const response = await page.request.get('/_vercel/speed-insights/script.js');

  if (isProd) {
    await expect(script).toHaveCount(1);
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
  } else {
    await expect(script).toHaveCount(0);
    expect(response.status()).toBe(404);
  }
});
