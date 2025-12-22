import { test, expect } from '@playwright/test';
import { runBeefLabScenario } from '../playwright/beefLabScenario';

const MEMORY_LIMIT_MB = 7;

test.describe('BeEF lab demo stability', () => {
  test.setTimeout(120_000);
  test.skip(({ browserName }) => browserName !== 'chromium', 'Memory metrics require Chromium');

  test('runs five demos without warnings or memory spikes', async ({ page }) => {
    const memorySupported = await page.evaluate(() => {
      const perf = performance as Performance & { memory?: { usedJSHeapSize?: number } };
      return Boolean(perf.memory && typeof perf.memory.usedJSHeapSize === 'number');
    });

    test.skip(!memorySupported, 'performance.memory is unavailable in this browser');

    const result = await runBeefLabScenario(page, { runs: 5 });

    expect(result.warnings, 'Console warnings were emitted during the demo runs').toEqual([]);

    expect(result.maxDeltaBytes).not.toBeNull();
    const deltaMb = (result.maxDeltaBytes ?? 0) / (1024 * 1024);
    expect(deltaMb).toBeLessThan(MEMORY_LIMIT_MB);

    await expect(page.getByRole('heading', { name: /Disclaimer/i })).toBeVisible();
  });
});
