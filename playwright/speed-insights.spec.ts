import { test, expect } from '@playwright/test';

test('Speed Insights respects runtime gating', async ({ page }) => {
  await page.goto('/');
  const script = page.locator('script[src*="/_vercel/speed-insights/script.js"]');

  const shouldInject =
    process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true' &&
    (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === 'true');

  await expect(script).toHaveCount(shouldInject ? 1 : 0);
});
