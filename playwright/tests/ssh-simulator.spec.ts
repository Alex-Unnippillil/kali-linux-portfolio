import { expect, test } from '@playwright/test';

test.describe('SSH simulator workflows', () => {
  test('manages sessions, transfers, and port forwards without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto('/apps/ssh');
    await expect(page.getByRole('heading', { name: 'SSH Command Builder' })).toBeVisible();

    const startHeap = await page.evaluate(() => {
      return typeof performance.memory?.usedJSHeapSize === 'number'
        ? performance.memory.usedJSHeapSize
        : 0;
    });

    await page.evaluate(() => {
      const latencies: number[] = [];
      const observers: PerformanceObserver[] = [];

      if ('PerformanceObserver' in window) {
        try {
          const eventObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const anyEntry = entry as any;
              if (typeof anyEntry.processingStart === 'number') {
                latencies.push(anyEntry.processingStart - anyEntry.startTime);
              }
            }
          });
          eventObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
          observers.push(eventObserver);
        } catch (err) {
          console.warn('PerformanceObserver event type unsupported', err);
        }

        try {
          const firstInputObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const anyEntry = entry as any;
              if (typeof anyEntry.processingStart === 'number') {
                latencies.push(anyEntry.processingStart - anyEntry.startTime);
              }
            }
          });
          firstInputObserver.observe({ type: 'first-input', buffered: true });
          observers.push(firstInputObserver);
        } catch (err) {
          console.warn('PerformanceObserver first-input unsupported', err);
        }
      }

      (window as typeof window & {
        __sshMetrics?: { latencies: number[]; observers: PerformanceObserver[] };
      }).__sshMetrics = { latencies, observers };
    });

    await page.locator('#ssh-user').fill('analyst');
    await page.locator('#ssh-host').fill('jump-box.internal');
    await page.locator('#ssh-port').fill('22');

    await page.getByRole('button', { name: 'New Tab' }).click();
    await expect(page.locator('text=Session 2')).toBeVisible();

    await page.locator('#ssh-user').fill('ops');
    await page.locator('#ssh-host').fill('10.0.5.10');
    await page.locator('#ssh-port').fill('2222');

    const sidecar = page.getByTestId('sftp-sidecar');
    await expect(sidecar).toBeVisible();
    await page.getByTestId('sftp-action-logs').click();
    await expect(page.getByTestId('sftp-status-logs')).toHaveText('Completed');
    await expect(page.getByTestId('sftp-progress-logs')).toHaveText('100%');

    const jumpToggle = page.getByTestId('port-forward-toggle-jump-host');
    await jumpToggle.click();
    await expect(page.getByTestId('port-forward-status-jump-host')).toHaveText('Disabled');
    await jumpToggle.click();
    await expect(page.getByTestId('port-forward-status-jump-host')).toHaveText('Enabled');

    const wikiToggle = page.getByTestId('port-forward-toggle-wiki');
    await wikiToggle.click();
    await expect(page.getByTestId('port-forward-status-wiki')).toHaveText('Enabled');

    await page.locator('button[aria-label="Close Tab"]').last().click();
    await expect(page.locator('text=Session 2')).toHaveCount(0);

    const metrics = await page.evaluate(() => {
      const metric = (window as typeof window & {
        __sshMetrics?: { latencies: number[]; observers: PerformanceObserver[] };
      }).__sshMetrics;

      metric?.observers.forEach((observer) => observer.disconnect());

      return {
        latencies: metric?.latencies ?? [],
        heap: typeof performance.memory?.usedJSHeapSize === 'number' ? performance.memory.usedJSHeapSize : 0,
      };
    });

    const endHeap = metrics.heap ?? 0;
    const heapGrowth = Math.max(0, endHeap - startHeap);
    expect(heapGrowth).toBeLessThanOrEqual(8 * 1024 * 1024);

    const latencies = metrics.latencies;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    expect(maxLatency).toBeLessThanOrEqual(100);

    expect(consoleErrors, 'No console errors expected').toEqual([]);
  });
});
