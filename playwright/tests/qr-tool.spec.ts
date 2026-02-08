import { test, expect } from '@playwright/test';

const seededCodes = Array.from({ length: 7 }, (_, index) => `seed-${index + 1}`);
const scannedCodes = ['scan-1', 'scan-2', 'scan-3'];

const quantile = (values: number[], q: number) => {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const position = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q));
  return sorted[position];
};

const readStreamToString = async (stream: NodeJS.ReadableStream | null): Promise<string> => {
  if (!stream) {
    return '';
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
};

test.describe('QR tool end-to-end flow', () => {
  test('scans, generates, exports, and remains stable', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.addInitScript(({ stored }) => {
      localStorage.setItem('qrScans', JSON.stringify(stored));
      sessionStorage.setItem('qrTrackStopped', 'false');
    }, { stored: seededCodes });

    await page.addInitScript(() => {
      const metrics = {
        frames: 0,
        deltas: [] as number[],
        latencies: [] as number[],
        lastTimestamp: 0,
      };
      const originalRAF = window.requestAnimationFrame.bind(window);
      const instrumented = (callback: FrameRequestCallback) => {
        const scheduled = performance.now();
        return originalRAF((timestamp) => {
          metrics.frames += 1;
          if (metrics.lastTimestamp) {
            metrics.deltas.push(timestamp - metrics.lastTimestamp);
          }
          metrics.lastTimestamp = timestamp;
          metrics.latencies.push(performance.now() - scheduled);
          callback(timestamp);
        });
      };
      window.requestAnimationFrame = instrumented;
      const pump = () => {
        instrumented(() => {
          pump();
        });
      };
      pump();
      (window as any).__rafMetrics = metrics;
    });

    await page.addInitScript(() => {
      const log: string[] = [];
      const wrapRequire = (original: any) => {
        const seen = new WeakSet();
        return function wrappedRequire(this: unknown, ...args: any[]) {
          const exported = original.apply(this, args);
          if (exported && typeof exported === 'object' && !seen.has(exported)) {
            seen.add(exported);
            if (
              typeof (exported as any).toDataURL === 'function' &&
              typeof (exported as any).toString === 'function'
            ) {
              if (!(exported as any).__playwrightPatched) {
                const originalDataURL = (exported as any).toDataURL.bind(exported);
                const originalToString = (exported as any).toString.bind(exported);
                (exported as any).toDataURL = async (...innerArgs: any[]) => {
                  log.push(innerArgs[0]);
                  return originalDataURL(...innerArgs);
                };
                (exported as any).toString = async (...innerArgs: any[]) => {
                  log.push(`svg:${innerArgs[0]}`);
                  return originalToString(...innerArgs);
                };
                (exported as any).__playwrightPatched = true;
              }
            }
          }
          return exported;
        };
      };

      const globalThisAny = window as any;
      const assignWrapped = (original: any) => {
        Object.defineProperty(globalThisAny, '__next_require__', {
          configurable: true,
          writable: true,
          value: wrapRequire(original),
        });
      };

      if (globalThisAny.__next_require__) {
        assignWrapped(globalThisAny.__next_require__);
      } else {
        Object.defineProperty(globalThisAny, '__next_require__', {
          configurable: true,
          set(value) {
            assignWrapped(value);
          },
        });
      }

      globalThisAny.__qrGenerationLog = log;
    });

    await page.addInitScript(({ codes }) => {
      const track = {
        kind: 'video',
        enabled: true,
        muted: false,
        readyState: 'live' as const,
        stopped: false,
        stop() {
          this.readyState = 'ended';
          this.stopped = true;
          sessionStorage.setItem('qrTrackStopped', 'true');
        },
        getCapabilities() {
          return { torch: true };
        },
        applyConstraints() {
          return Promise.resolve();
        },
      };

      const stream = {
        active: true,
        id: 'mock-stream',
        getTracks() {
          return [track as MediaStreamTrack];
        },
        getVideoTracks() {
          return [track as MediaStreamTrack];
        },
      } as unknown as MediaStream;

      navigator.mediaDevices = navigator.mediaDevices || ({} as MediaDevices);
      navigator.mediaDevices.getUserMedia = async () => stream;

      const attemptPatch = () => {
        const readerClass =
          (window as any).BrowserQRCodeReader ||
          (window as any).ZXingBrowser?.BrowserQRCodeReader;
        if (!readerClass) {
          setTimeout(attemptPatch, 10);
          return;
        }
        if ((readerClass as any).__playwrightPatched) {
          return;
        }
        const proto = readerClass.prototype;
        proto.decodeFromVideoDevice = function decode(
          _deviceId: string | null,
          _video: HTMLVideoElement,
          callback: (result: { getText: () => string }, error?: unknown) => void,
        ) {
          let index = 0;
          const feed = () => {
            if (index >= codes.length) {
              track.stop();
              return;
            }
            const value = codes[index++];
            callback(
              {
                getText: () => value,
              },
              undefined,
            );
            setTimeout(feed, 30);
          };
          setTimeout(feed, 30);
          return Promise.resolve();
        };
        const originalReset = proto.reset?.bind(proto);
        proto.reset = function reset() {
          track.stop();
          return originalReset?.();
        };
        (readerClass as any).__playwrightPatched = true;
      };

      attemptPatch();
      (window as any).__qrMock = { stream, track };
    }, { codes: scannedCodes });

    await page.goto('/qr');

    await page.waitForLoadState('networkidle');

    await expect(page.getByText(`Decoded: ${scannedCodes[2]}`)).toBeVisible();

    const listItems = page.locator('ul >> li');
    await expect(listItems).toHaveCount(10);
    for (const [offset, code] of scannedCodes.entries()) {
      await expect(listItems.nth(seededCodes.length + offset)).toHaveText(code);
    }

    const preview = page.locator('img[alt="Generated QR code"]');
    const generateButton = page.getByRole('button', { name: 'Generate' });

    await page.fill('#qr-text', 'Alpha payload');
    await generateButton.click();
    await expect(preview).toBeVisible();

    await page.fill('#qr-text', 'Beta payload');
    await generateButton.click();
    await expect(preview).toBeVisible();

    await page.getByRole('tab', { name: 'URL' }).click();
    await page.fill('#qr-url', 'https://example.com/alpha');
    await generateButton.click();
    await expect(preview).toBeVisible();

    await page.getByRole('tab', { name: 'Wi-Fi' }).click();
    await page.getByLabel('SSID').fill('LabNet');
    await page.getByLabel('Password').fill('supersecret');
    await page.getByLabel('Encryption').selectOption('WEP');
    await generateButton.click();
    await expect(preview).toBeVisible();

    await page.getByRole('tab', { name: 'vCard' }).click();
    await page.getByLabel('Full Name').fill('Ada Lovelace');
    await page.getByLabel('Organization').fill('Analytical Engine Society');
    await page.getByLabel('Phone').fill('123-456-7890');
    await page.getByLabel('Email').fill('ada@example.com');
    await generateButton.click();
    await expect(preview).toBeVisible();

    const generationLog = await page.evaluate(() => {
      const log = (window as any).__qrGenerationLog || [];
      return log.filter((entry: string) => !entry.startsWith('svg:'));
    });
    expect(generationLog.length).toBeGreaterThanOrEqual(5);

    await expect(listItems).toHaveCount(10);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);
    const csvContent = await readStreamToString(await download.createReadStream());
    const rows = csvContent.trim().split('\n');
    expect(rows).toHaveLength(1 + seededCodes.length + scannedCodes.length);
    expect(rows.at(-1)).toBe(`"${scannedCodes[2]}"`);

    const metrics = await page.evaluate(() => (window as any).__rafMetrics);
    expect(metrics.frames).toBeGreaterThan(20);
    expect(metrics.deltas.length).toBeGreaterThan(10);
    expect(metrics.latencies.length).toBeGreaterThan(10);

    const averageDelta = metrics.deltas.reduce((sum: number, value: number) => sum + value, 0) /
      metrics.deltas.length;
    expect(averageDelta).toBeLessThan(40);
    expect(quantile(metrics.deltas, 0.95)).toBeLessThan(80);

    const averageLatency = metrics.latencies.reduce((sum: number, value: number) => sum + value, 0) /
      metrics.latencies.length;
    expect(averageLatency).toBeLessThan(35);
    expect(quantile(metrics.latencies, 0.95)).toBeLessThan(60);

    const trackState = await page.evaluate(() => {
      const mock = (window as any).__qrMock;
      if (!mock) {
        return null;
      }
      return {
        readyState: mock.track.readyState,
        stopped: mock.track.stopped,
        stopFlag: sessionStorage.getItem('qrTrackStopped'),
      };
    });
    expect(trackState).toEqual({ readyState: 'ended', stopped: true, stopFlag: 'true' });

    expect(consoleErrors).toEqual([]);
  });
});
