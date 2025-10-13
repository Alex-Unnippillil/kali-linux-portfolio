import { test, expect } from '@playwright/test';

const PERFORMANCE_BUDGETS = {
  domContentLoaded: 4500,
  scriptTransfer: 900_000,
  styleTransfer: 350_000,
  timeToFirstByte: 1200,
  totalTransfer: 1_600_000,
} as const;

test.skip(
  process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true',
  'Speed Insights script is disabled during static export',
);

test('Speed Insights script is injected in production', async ({ page }) => {
  await page.goto('/');
  const script = page.locator('script[src*="/_vercel/speed-insights/script.js"]');
  await expect(script).toHaveCount(1);
});

test('homepage meets performance budgets', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const metrics = await page.evaluate(() => {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    const summary = resourceEntries.reduce(
      (acc, entry) => {
        const transfer = entry.transferSize ?? 0;
        acc.total += transfer;
        if (entry.initiatorType === 'script') {
          acc.script += transfer;
        }
        if (
          entry.initiatorType === 'style' ||
          (entry.initiatorType === 'link' && /\.css(\?|$)/.test(entry.name))
        ) {
          acc.style += transfer;
        }
        return acc;
      },
      { total: 0, script: 0, style: 0 },
    );

    if (navigationEntry) {
      summary.total += navigationEntry.transferSize ?? 0;
    }

    return {
      navigation: navigationEntry
        ? {
            domContentLoaded: navigationEntry.domContentLoadedEventEnd,
            timeToFirstByte: navigationEntry.responseStart,
          }
        : null,
      summary,
    } as const;
  });

  expect(metrics.navigation).not.toBeNull();
  if (!metrics.navigation) {
    return;
  }

  expect(metrics.summary.total).toBeLessThanOrEqual(PERFORMANCE_BUDGETS.totalTransfer);
  expect(metrics.summary.script).toBeLessThanOrEqual(PERFORMANCE_BUDGETS.scriptTransfer);
  expect(metrics.summary.style).toBeLessThanOrEqual(PERFORMANCE_BUDGETS.styleTransfer);
  expect(metrics.navigation.domContentLoaded).toBeLessThanOrEqual(PERFORMANCE_BUDGETS.domContentLoaded);
  expect(metrics.navigation.timeToFirstByte).toBeLessThanOrEqual(PERFORMANCE_BUDGETS.timeToFirstByte);
});
