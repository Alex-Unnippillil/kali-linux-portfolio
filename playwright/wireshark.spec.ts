import { test, expect } from '@playwright/test';

test.describe('Wireshark capture workflow', () => {
  test('loads HTTP sample, follows stream, exports filter, and stays within memory budget', async ({
    page,
    context,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.addInitScript(() => {
      const globalWindow = window as typeof window & { __clipboardWrites?: string[] };
      globalWindow.__clipboardWrites = [];

      const original = navigator.clipboard?.writeText?.bind(navigator.clipboard);
      const stub = async (text: string) => {
        globalWindow.__clipboardWrites?.push(text);
        if (original) {
          try {
            await original(text);
          } catch {
            // Ignore clipboard permission issues during automated tests
          }
        }
      };

      if (navigator.clipboard) {
        (navigator.clipboard as Clipboard & { writeText: typeof stub }).writeText = stub;
      } else {
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: stub },
          configurable: true,
        });
      }
    });

    const tracePath = test.info().outputPath('wireshark-trace.zip');
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    try {
      await page.goto('/apps/wireshark');
      await expect(page.getByRole('button', { name: /Legend/i })).toBeVisible();

      const baselineMemory = await page.evaluate(() => {
        const memory = (window.performance as Performance & {
          memory?: { usedJSHeapSize: number };
        }).memory;
        return memory?.usedJSHeapSize ?? null;
      });

      if (baselineMemory === null) {
        test.skip('window.performance.memory is not available in this browser');
      }

      const sampleSelect = page.locator('select').first();
      await sampleSelect.selectOption('/samples/wireshark/http.pcap');

      const packetRows = page.locator('table tbody tr');
      await expect(packetRows.first()).toBeVisible();

      await page.getByRole('button', { name: 'HTTP(S)' }).click();
      const filterInput = page.getByLabel('Quick search');
      await expect(filterInput).toHaveValue('tcp.port == 80 || tcp.port == 443');

      await packetRows.first().click();
      await expect(page.getByText('Ethernet')).toBeVisible();

      await page.getByRole('button', { name: 'Copy' }).click();
      await expect.poll(async () =>
        page.evaluate(() => {
          const globalWindow = window as typeof window & { __clipboardWrites?: string[] };
          const history = globalWindow.__clipboardWrites ?? [];
          return history[history.length - 1] ?? null;
        }),
      ).toBe('tcp.port == 80 || tcp.port == 443');

      const fps = await page.evaluate(async () => {
        const table = document.querySelector('table');
        const container = table?.closest('div');
        if (!table || !container) return null;
        const scrollContainer = container as HTMLElement;
        scrollContainer.scrollTop = 0;

        return await new Promise<number>((resolve) => {
          const start = performance.now();
          let frames = 0;

          const tick = (timestamp: number) => {
            frames += 1;
            scrollContainer.scrollTop = (scrollContainer.scrollTop + 60) % Math.max(scrollContainer.scrollHeight, 1);
            if (timestamp - start >= 500) {
              const elapsed = timestamp - start;
              resolve((frames * 1000) / elapsed);
              return;
            }
            requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
        });
      });

      if (fps !== null) {
        test.info().annotations.push({
          type: 'perf',
          description: `Wireshark scroll FPS ≈ ${fps.toFixed(1)}`,
        });
      }

      await page.goto('/');
      const postMemory = await page.evaluate(() => {
        const memory = (window.performance as Performance & {
          memory?: { usedJSHeapSize: number };
        }).memory;
        return memory?.usedJSHeapSize ?? null;
      });

      expect(postMemory).not.toBeNull();
      const deltaMb = ((postMemory! - baselineMemory!) / (1024 * 1024));
      expect(deltaMb).toBeLessThanOrEqual(5);

      expect(consoleErrors).toEqual([]);
    } finally {
      await context.tracing.stop({ path: tracePath });
      test.info().attach('wireshark-trace', {
        path: tracePath,
        contentType: 'application/zip',
      });
    }
  });
});
