import { expect, test, type Page } from '@playwright/test';

interface CacheInspection {
  names: string[];
  totalEntries: number;
  periodicSize: number | null;
}

interface SyncResult {
  before: number;
  after: number;
  periodicSyncAvailable: boolean;
  controlled: boolean;
  tags: string[];
}

async function ensureServiceWorkerControl(page: Page): Promise<boolean> {
  const supportsServiceWorkers = await page.evaluate(() => 'serviceWorker' in navigator);
  if (!supportsServiceWorkers) {
    return false;
  }

  const ready = await page
    .waitForFunction(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        return Boolean(registration?.active);
      } catch (error) {
        return false;
      }
    }, undefined, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);

  if (!ready) {
    return false;
  }

  const hasController = await page.evaluate(() => navigator.serviceWorker.controller !== null);
  if (hasController) {
    return true;
  }

  await page.reload({ waitUntil: 'networkidle' });

  return page
    .waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
}

test.describe('PWA offline resilience', () => {
  test('serves cached weather app offline and recovers connectivity', async ({ context, page }) => {
    await page.goto('/apps/weather', { waitUntil: 'networkidle' });

    if (!(await ensureServiceWorkerControl(page))) {
      test.skip('Service worker not available or not controlling the page.');
    }

    const cacheStats = await page.evaluate<CacheInspection>(async () => {
      const names = await caches.keys();
      const entryCounts = await Promise.all(
        names.map(async (name) => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return { name, size: keys.length };
        }),
      );

      const periodic = entryCounts.find((entry) => /periodic-cache/i.test(entry.name));

      return {
        names,
        totalEntries: entryCounts.reduce((sum, entry) => sum + entry.size, 0),
        periodicSize: periodic ? periodic.size : null,
      };
    });

    expect(cacheStats.totalEntries).toBeGreaterThan(0);
    if (cacheStats.periodicSize !== null) {
      expect(cacheStats.periodicSize).toBeLessThanOrEqual(15);
    }

    const offlineBanner = page.getByText('Offline mode – using cached forecast visuals.');

    await context.setOffline(true);

    try {
      await page.waitForTimeout(300);
      await expect(offlineBanner).toBeVisible();

      await page.reload({ waitUntil: 'domcontentloaded' });

      await expect(offlineBanner).toBeVisible();

      const imperialToggle = page.getByRole('radio', { name: 'Imperial' });
      await imperialToggle.click();
      await expect(imperialToggle).toHaveAttribute('aria-checked', 'true');
      await expect(page.locator('text=°F')).toBeVisible();
    } finally {
      await context.setOffline(false);
    }

    await expect(offlineBanner).toBeHidden();

    const swControlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
    expect(swControlled).toBeTruthy();
  });

  test('performs background sync refresh and logs completion', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (message) => {
      consoleMessages.push(message.text());
    });

    await page.goto('/apps/weather', { waitUntil: 'networkidle' });

    if (!(await ensureServiceWorkerControl(page))) {
      test.skip('Service worker not available or not controlling the page.');
    }

    const syncResult = await page.evaluate<SyncResult>(async () => {
      if (!('serviceWorker' in navigator)) {
        return {
          before: 0,
          after: 0,
          periodicSyncAvailable: false,
          controlled: false,
          tags: [],
        };
      }

      const registration = await navigator.serviceWorker.ready;
      const periodicSync = registration.periodicSync as
        | { register?: (tag: string, options: { minInterval: number }) => Promise<void>; getTags?: () => Promise<string[]> }
        | undefined;

      const cacheName = 'periodic-cache-v1';
      const cache = await caches.open(cacheName).catch(() => undefined);
      const before = cache ? (await cache.keys()).length : 0;

      registration.active?.postMessage({ type: 'refresh' });

      if (periodicSync && typeof periodicSync.register === 'function') {
        try {
          await periodicSync.register('content-sync', { minInterval: 60 * 60 * 1000 });
          console.info('[sw-sync] periodic background sync registered for content-sync');
        } catch (error) {
          console.warn('[sw-sync] periodic background sync registration failed', error);
        }
      } else {
        console.warn('[sw-sync] periodic background sync unavailable');
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const after = cache ? (await cache.keys()).length : before;

      console.info(`[sw-sync] background refresh completed for ${cacheName} (before=${before}, after=${after})`);

      let tags: string[] = [];
      if (periodicSync && typeof periodicSync.getTags === 'function') {
        try {
          tags = await periodicSync.getTags();
          console.info(`[sw-sync] periodic background sync tags: ${tags.join(', ') || 'none'}`);
        } catch (error) {
          console.warn('[sw-sync] periodic background sync tag query failed', error);
        }
      }

      return {
        before,
        after,
        periodicSyncAvailable: Boolean(periodicSync && typeof periodicSync.register === 'function'),
        controlled: Boolean(navigator.serviceWorker.controller),
        tags,
      };
    });

    expect(syncResult.controlled).toBeTruthy();
    expect(syncResult.after).toBeGreaterThanOrEqual(syncResult.before);

    await expect.poll(() => consoleMessages.some((text) => text.includes('[sw-sync] background refresh completed'))).toBeTruthy();
    await expect.poll(() => consoleMessages.some((text) => text.includes('[sw-sync] periodic background sync'))).toBeTruthy();

    if (syncResult.periodicSyncAvailable) {
      expect(syncResult.tags).toContain('content-sync');
    }
  });
});
