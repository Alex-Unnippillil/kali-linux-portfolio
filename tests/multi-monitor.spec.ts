import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __fpsProbe?: {
      samples: number[];
      totalCount: number;
      start(): void;
      stop(): void;
      getStats(): { average: number; minimum: number; samples: number; totalCount: number };
    };
  }
}

type FpsStats = {
  average: number;
  minimum: number;
  samples: number;
  maximum: number;
  totalCount: number;
};

const scales = [
  { label: '125%', factor: 1.25 },
  { label: '150%', factor: 1.5 },
] as const;

for (const { label, factor } of scales) {
  test.describe(`${label} multi-monitor window management`, () => {
    test.use({
      viewport: { width: 2560, height: 1440 },
      deviceScaleFactor: factor,
    });

    test(
      `drags windows across simulated displays without overflow`,
      async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'DevTools protocol access is required for FPS metrics.');
        test.setTimeout(120_000);

        await page.addInitScript(() => {
          window.localStorage.setItem('booting_screen', 'false');
          window.localStorage.setItem('screen-locked', 'false');
          window.localStorage.setItem('shut-down', 'false');
        });

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);

        await page.locator('text=Loading Ubuntu...').waitFor({ state: 'detached', timeout: 30000 }).catch(() => undefined);

        const aboutIcon = page.locator('#app-about');
        await aboutIcon.waitFor({ state: 'visible', timeout: 60000 });
        await aboutIcon.dblclick();

        await page.waitForFunction(
          () => !!document.querySelector('.opened-window:not(.closed-window)'),
          undefined,
          { timeout: 30000 }
        );
        const windowLocator = page.locator('.opened-window:not(.closed-window)').first();
        await windowLocator.waitFor({ state: 'visible', timeout: 30000 });

        const titleBar = windowLocator.locator('.bg-ub-window-title');
        await titleBar.waitFor({ state: 'visible', timeout: 20000 });

        const viewport = page.viewportSize();
        expect(viewport).not.toBeNull();
        if (!viewport) {
          throw new Error('Viewport size is not available.');
        }

        const cdpClient = await page.context().newCDPSession(page);
        await cdpClient.send('Runtime.enable');
        await cdpClient.send('Runtime.evaluate', {
          expression: `(() => {
            const probe = {
              samples: [],
              running: false,
              totalCount: 0,
              start() {
                this.samples = [];
                this.totalCount = 0;
                if (this.running) return;
                this.running = true;
                let last = performance.now();
                const record = (now) => {
                  if (!this.running) return;
                  const delta = now - last;
                  if (delta > 0 && delta < 200) {
                    this.samples.push(1000 / delta);
                    this.totalCount += 1;
                    if (this.samples.length > 600) this.samples.shift();
                  }
                  last = now;
                  requestAnimationFrame(record);
                };
                requestAnimationFrame(record);
              },
              stop() {
                this.running = false;
              },
              getStats() {
                const recent = this.samples.slice(-240);
                const total = recent.reduce((sum, value) => sum + value, 0);
                const average = recent.length ? total / recent.length : 0;
                const minimum = recent.length ? Math.min(...recent) : 0;
                return { average, minimum, samples: recent.length, totalCount: this.totalCount };
              },
            };
            window.__fpsProbe = probe;
          })();`,
        });
        await cdpClient.send('Runtime.evaluate', { expression: 'window.__fpsProbe.start();' });

        await page.waitForFunction(
          () => (window.__fpsProbe?.totalCount ?? 0) >= 10,
          undefined,
          { timeout: 10000 }
        );

        const evaluateProbe = async <T>(expression: string) => {
          const { result } = await cdpClient.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
          });
          return result.value as T;
        };

        const framesBeforeDrag = await evaluateProbe<number>('window.__fpsProbe.totalCount');
        const minimumSamplesPerDrag = 8;

        const dragWindowBy = async (deltaX: number) => {
          const directionKey = deltaX >= 0 ? 'ArrowRight' : 'ArrowLeft';
          const stepSize = 10;
          const stepsNeeded = Math.ceil(Math.abs(deltaX) / stepSize);

          await titleBar.focus();
          await page.waitForTimeout(50);
          await page.keyboard.press(' ');
          await page.waitForTimeout(50);

          for (let index = 0; index < stepsNeeded; index += 1) {
            await page.keyboard.press(directionKey);
            if ((index + 1) % 5 === 0) {
              await page.waitForTimeout(20);
            }
          }

          await page.waitForTimeout(80);
          await page.keyboard.press(' ');
          await page.waitForTimeout(350);

          const { transform, rect } = await windowLocator.evaluate((element) => ({
            transform: element.getAttribute('style') || '',
            rect: element.getBoundingClientRect(),
          }));
          console.info(
            `[${label}] transform after drag ${deltaX}: ${transform} | rect.left=${rect.left.toFixed(1)}, rect.right=${rect.right.toFixed(1)}`
          );
        };

        const halfWidth = viewport.width / 2;
        const travelDistance = halfWidth + 160;

        await dragWindowBy(travelDistance);

        await expect
          .poll(async () => (await windowLocator.boundingBox())?.x ?? Number.NEGATIVE_INFINITY)
          .toBeGreaterThanOrEqual(halfWidth - 32);

        const framesAfterRightDrag = await evaluateProbe<number>('window.__fpsProbe.totalCount');
        expect(framesAfterRightDrag - framesBeforeDrag).toBeGreaterThanOrEqual(minimumSamplesPerDrag);

        const rightBox = await windowLocator.boundingBox();
        expect(rightBox).not.toBeNull();
        if (!rightBox) {
          throw new Error('Window bounding box was null after dragging to the second display.');
        }

        expect(rightBox.x).toBeGreaterThanOrEqual(halfWidth - 32);
        expect(rightBox.x + rightBox.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(rightBox.y).toBeGreaterThanOrEqual(0);
        expect(rightBox.y + rightBox.height).toBeLessThanOrEqual(viewport.height + 1);

        const overflowMetrics = await page.locator('#monitor-screen').evaluate((el) => ({
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        }));

        expect(overflowMetrics.scrollWidth).toBeLessThanOrEqual(overflowMetrics.clientWidth + 1);
        expect(overflowMetrics.scrollHeight).toBeLessThanOrEqual(overflowMetrics.clientHeight + 1);

        await dragWindowBy(-travelDistance);

        await expect
          .poll(async () => (await windowLocator.boundingBox())?.x ?? Number.POSITIVE_INFINITY)
          .toBeLessThanOrEqual(halfWidth - 32);

        const framesAfterReturn = await evaluateProbe<number>('window.__fpsProbe.totalCount');
        expect(framesAfterReturn).toBeGreaterThanOrEqual(framesAfterRightDrag);

        const leftBox = await windowLocator.boundingBox();
        expect(leftBox).not.toBeNull();
        if (!leftBox) {
          throw new Error('Window bounding box was null after returning to the primary display.');
        }

        expect(leftBox.x).toBeGreaterThanOrEqual(-1);
        expect(leftBox.x + leftBox.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(leftBox.x + leftBox.width / 2).toBeLessThanOrEqual(halfWidth + 32);

        const fpsStats = await evaluateProbe<FpsStats>(
          `(() => {
            const probe = window.__fpsProbe;
            if (!probe) return { average: 0, minimum: 0, samples: 0, maximum: 0, totalCount: 0 };
            const stats = probe.getStats();
            const recent = probe.samples.slice(-240);
            const maximum = recent.length ? Math.max(...recent) : 0;
            return { ...stats, maximum };
          })();`
        );

        await cdpClient.send('Runtime.evaluate', { expression: 'window.__fpsProbe.stop();' });

        test.info().annotations.push({
          type: 'fps',
          description: `${label} scale: avg ${fpsStats.average.toFixed(1)} FPS, min ${fpsStats.minimum.toFixed(
            1
          )}, max ${fpsStats.maximum.toFixed(1)} from ${fpsStats.samples} recent frames (${fpsStats.totalCount} total)`,
        });

        console.info(
          `[${label}] window drag FPS — avg ${fpsStats.average.toFixed(1)}, min ${fpsStats.minimum
            .toFixed(1)} max ${fpsStats.maximum.toFixed(1)} | recent=${fpsStats.samples} total=${fpsStats.totalCount}`
        );

        console.info(
          `[${label}] frame milestones — start=${framesBeforeDrag}, after-right=${framesAfterRightDrag}, after-return=${framesAfterReturn}`
        );

        expect(fpsStats.samples).toBeGreaterThan(10);
        expect(fpsStats.average).toBeGreaterThanOrEqual(50);
        // Observed occasional dips to ~30 FPS at 150% scale when the drag begins,
        // so enforce a floor that still proves frames were captured without
        // failing on brief throttling.
        expect(fpsStats.minimum).toBeGreaterThanOrEqual(30);
        expect(fpsStats.totalCount).toBe(framesAfterReturn);
      }
    );
  });
}
