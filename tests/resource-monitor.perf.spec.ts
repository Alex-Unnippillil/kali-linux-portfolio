import { test, expect, type Page } from '@playwright/test';

const APP_ID = 'resource-monitor';

const waitForMainThreadMetrics = async (page: Page) => {
  await page.waitForFunction(() => {
    const store = (window as any).__playwright_mainThreadWork;
    if (!Array.isArray(store)) return false;
    const numeric = store.filter((value) => typeof value === 'number' && !Number.isNaN(value));
    return numeric.length >= 5;
  });
};

test.describe('Resource monitor performance', () => {
  test('main thread work stays under 8ms', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#desktop');
    await page.waitForFunction(() => {
      const bootLogo = document.querySelector('img[alt="Ubuntu Logo"]');
      if (!bootLogo) return true;
      const bootContainer = bootLogo.closest('div');
      if (!bootContainer) return true;
      return bootContainer.classList.contains('invisible');
    });

    await page.evaluate((id) => {
      window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    }, APP_ID);

    await page.waitForSelector(`#${APP_ID}`);
    await waitForMainThreadMetrics(page);

    const maxDuration = await page.evaluate(() => {
      const store = ((window as any).__playwright_mainThreadWork || []) as number[];
      return store.reduce((max, value) => {
        if (typeof value !== 'number' || Number.isNaN(value)) return max;
        return value > max ? value : max;
      }, 0);
    });

    expect(maxDuration).toBeLessThan(8);
  });
});
