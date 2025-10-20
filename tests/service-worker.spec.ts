import { expect, test, type Page } from '@playwright/test';

async function ensureServiceWorkerReady(page: Page): Promise<void> {
  const supportsSW = await page.evaluate(() => 'serviceWorker' in navigator);
  expect(supportsSW).toBeTruthy();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        const handleChange = () => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.removeEventListener('controllerchange', handleChange);
            resolve();
          }
        };
        navigator.serviceWorker.addEventListener('controllerchange', handleChange);
      });
    }
  });
}

test.describe('service worker integration', () => {
  test('serves offline fallback page when network is unavailable', async ({ context, page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await ensureServiceWorkerReady(page);

    try {
      await context.setOffline(true);
      const response = await page.goto('/__playwright-offline-check');
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { name: 'Offline' })).toBeVisible();
      await expect(page.getByText(/You appear to be offline/i)).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });

  test('surfaces update toast when a new service worker is waiting', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await ensureServiceWorkerReady(page);

    await page.waitForFunction(() => typeof (window as typeof window & { workbox?: unknown }).workbox !== 'undefined');

    await page.evaluate(() => {
      const globalWindow = window as typeof window & {
        __reloadCount: number;
        __skipWaitingCount: number;
        __originalReload?: () => void;
        workbox?: {
          messageSkipWaiting: () => Promise<void>;
        };
      };

      globalWindow.__reloadCount = 0;
      globalWindow.__skipWaitingCount = 0;
      const originalReload = window.location.reload.bind(window.location);
      Object.defineProperty(globalWindow, '__originalReload', {
        value: originalReload,
        configurable: true,
      });
      window.location.reload = () => {
        globalWindow.__reloadCount += 1;
      };

      if (globalWindow.workbox) {
        const wb = globalWindow.workbox;
        wb.messageSkipWaiting = async () => {
          globalWindow.__skipWaitingCount += 1;
        };
      }
    });

    await page.evaluate(() => {
      const wb = (window as typeof window & { workbox?: EventTarget }).workbox;
      wb?.dispatchEvent(new Event('waiting'));
    });

    const toast = page.getByRole('status', {
      name: /new update available/i,
    });
    await expect(toast).toBeVisible();
    const reloadButton = page.getByRole('button', { name: /reload now/i });
    await expect(reloadButton).toBeVisible();

    await reloadButton.click();

    await page.evaluate(() => {
      const wb = (window as typeof window & { workbox?: EventTarget }).workbox;
      wb?.dispatchEvent(new Event('controlling'));
    });

    await expect(page.getByRole('status', { name: /new update available/i })).toHaveCount(0);

    const [reloadCount, skipWaitingCount] = await Promise.all([
      page.evaluate(() => (window as typeof window & { __reloadCount: number }).__reloadCount),
      page.evaluate(() => (window as typeof window & { __skipWaitingCount: number }).__skipWaitingCount),
    ]);

    expect(reloadCount).toBe(1);
    expect(skipWaitingCount).toBe(1);
  });
});

