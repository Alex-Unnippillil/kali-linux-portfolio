import { test, expect } from '@playwright/test';

import { clientEnv } from '../lib/env.client';

test.skip(
  clientEnv.NEXT_PUBLIC_STATIC_EXPORT === 'true',
  'Speed Insights script is disabled during static export',
);

test('Speed Insights script is injected in production', async ({ page }) => {
  await page.goto('/');
  const script = page.locator('script[src*="/_vercel/speed-insights/script.js"]');
  await expect(script).toHaveCount(1);
});
