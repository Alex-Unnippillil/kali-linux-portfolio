import { test, expect } from '@playwright/test';

const PLAYLIST = Array.from({ length: 10 }, (_, index) => ({
  title: `Track ${index + 1}`,
  url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(index % 3) + 1}.mp3`,
}));

test.describe('Spotify desktop app regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const g = window as unknown as {
        __spotifyTimerRegistry?: {
          tracking: boolean;
          timeouts: Set<number>;
          intervals: Set<number>;
          rafs: Set<number>;
        };
        __startSpotifyTimerTracking?: () => void;
        __stopSpotifyTimerTracking?: () => void;
        __spotifyContexts?: any[];
      };

      const timerRegistry = {
        tracking: false,
        timeouts: new Set<number>(),
        intervals: new Set<number>(),
        rafs: new Set<number>(),
      };

      g.__spotifyTimerRegistry = timerRegistry;

      const originalSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        let timerId = 0;
        if (typeof handler === 'function') {
          const wrapped = (...cbArgs: unknown[]) => {
            if (timerRegistry.tracking) timerRegistry.timeouts.delete(timerId);
            handler(...(cbArgs as Parameters<typeof handler>));
          };
          timerId = originalSetTimeout(wrapped as TimerHandler, timeout, ...args) as unknown as number;
        } else {
          timerId = originalSetTimeout(handler, timeout, ...args) as unknown as number;
        }
        if (timerRegistry.tracking) timerRegistry.timeouts.add(timerId);
        return timerId;
      }) as typeof setTimeout;

      const originalClearTimeout = window.clearTimeout.bind(window);
      window.clearTimeout = ((id: number) => {
        if (timerRegistry.tracking) timerRegistry.timeouts.delete(id);
        return originalClearTimeout(id);
      }) as typeof clearTimeout;

      const originalSetInterval = window.setInterval.bind(window);
      window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        const intervalId = originalSetInterval(handler, timeout, ...args) as unknown as number;
        if (timerRegistry.tracking) timerRegistry.intervals.add(intervalId);
        return intervalId;
      }) as typeof setInterval;

      const originalClearInterval = window.clearInterval.bind(window);
      window.clearInterval = ((id: number) => {
        if (timerRegistry.tracking) timerRegistry.intervals.delete(id);
        return originalClearInterval(id);
      }) as typeof clearInterval;

      const originalRequestAnimationFrame = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
        let rafId = 0;
        const wrapped = (time: DOMHighResTimeStamp) => {
          if (timerRegistry.tracking) timerRegistry.rafs.delete(rafId);
          callback(time);
        };
        rafId = originalRequestAnimationFrame(wrapped);
        if (timerRegistry.tracking) timerRegistry.rafs.add(rafId);
        return rafId;
      }) as typeof requestAnimationFrame;

      const originalCancelAnimationFrame = window.cancelAnimationFrame.bind(window);
      window.cancelAnimationFrame = ((id: number) => {
        if (timerRegistry.tracking) timerRegistry.rafs.delete(id);
        return originalCancelAnimationFrame(id);
      }) as typeof cancelAnimationFrame;

      g.__startSpotifyTimerTracking = () => {
        timerRegistry.tracking = true;
        timerRegistry.timeouts.clear();
        timerRegistry.intervals.clear();
        timerRegistry.rafs.clear();
      };

      g.__stopSpotifyTimerTracking = () => {
        timerRegistry.tracking = false;
      };

      const contexts: any[] = [];
      g.__spotifyContexts = contexts;

      const OriginalAudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (OriginalAudioContext) {
        class PatchedAudioContext extends OriginalAudioContext {
          __closed = false;

          constructor(...args: any[]) {
            super(...args);
            contexts.push(this);
          }

          async close(): Promise<void> {
            if (typeof super.close === 'function') {
              await super.close();
            }
            this.__closed = true;
          }
        }

        const patchedProto = PatchedAudioContext.prototype as AudioContext;
        (patchedProto as any).decodeAudioData = function () {
          const sampleRate = (this as AudioContext).sampleRate || 44100;
          const durationSeconds = 6;
          const frameCount = Math.max(1, Math.floor(sampleRate * durationSeconds));
          const buffer = (this as AudioContext).createBuffer(1, frameCount, sampleRate);
          return Promise.resolve(buffer);
        };

        window.AudioContext = PatchedAudioContext as unknown as typeof AudioContext;
        if ((window as any).webkitAudioContext) {
          (window as any).webkitAudioContext = window.AudioContext;
        }
      }

      const originalFetch = window.fetch?.bind(window);
      if (originalFetch) {
        window.fetch = (async (...args: Parameters<typeof fetch>) => {
          const [resource] = args;
          const url = typeof resource === 'string' ? resource : resource?.url;
          if (url && url.includes('soundhelix.com')) {
            const buffer = new Uint8Array(44100);
            return new Response(buffer.buffer, {
              headers: { 'Content-Type': 'audio/mpeg' },
            });
          }
          if (url && url.includes('lrclib.net')) {
            const body = JSON.stringify({
              syncedLyrics: '[00:00.00]Instrumental intro\n[00:05.00]Instrumental groove',
            });
            return new Response(body, {
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return originalFetch(...args);
        }) as typeof fetch;
      }
    });
  });

  test('plays through the playlist without leaks', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'FPS metrics are only exposed in Chromium.');

    await page.goto('/');
    await page.getByRole('button', { name: 'Applications' }).waitFor({ state: 'visible' });

    const metricsStart = await page.metrics();
    const fpsStart = metricsStart.FramesPerSecond ?? metricsStart.FPS ?? metricsStart.Frames ?? 0;

    await page.getByRole('button', { name: 'Applications' }).click();
    const search = page.getByPlaceholder('Search');
    await search.fill('Spotify');

    await page.evaluate(() => (window as any).__startSpotifyTimerTracking?.());
    await page.locator('#app-spotify').click();

    const spotifyWindow = page.locator('#spotify');
    await expect(spotifyWindow).toBeVisible();

    const textarea = spotifyWindow.locator('textarea');
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill(JSON.stringify(PLAYLIST, null, 2));
    await spotifyWindow.getByRole('button', { name: 'Load Playlist' }).click();
    await expect(spotifyWindow.getByRole('button', { name: 'Track 10' })).toBeVisible();

    await spotifyWindow.getByTitle('Play/Pause').click();

    const progress = spotifyWindow.locator('input.w-full.h-1');
    await progress.waitFor({ state: 'visible' });

    const metricsMid = await page.metrics();
    const fpsMid = metricsMid.FramesPerSecond ?? metricsMid.FPS ?? metricsMid.Frames ?? fpsStart;

    const progressMax = Number((await progress.getAttribute('max')) || '6');
    const seeks = [0.1, 0.45, 0.8, 0.2, 0.65];
    for (const fraction of seeks) {
      const target = Math.min(progressMax, Math.max(0, progressMax * fraction));
      await progress.evaluate((element, value) => {
        (element as HTMLInputElement).value = value.toString();
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }, target);
    }

    const titleLocator = spotifyWindow.locator('.windowMainScreen p.mb-2').first();
    await expect(titleLocator).toHaveText('Track 1');

    for (let i = 2; i <= 4; i += 1) {
      await spotifyWindow.getByTitle('Next').click();
      await expect(titleLocator).toHaveText(`Track ${i}`);
    }

    await spotifyWindow.getByTitle('Previous').click();
    await expect(titleLocator).toHaveText('Track 3');

    const statusToggle = page.locator('#status-bar');
    await statusToggle.click();
    const themeToggle = page.getByRole('button', { name: /Theme/i });
    const initialThemeIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await themeToggle.click();
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .not.toBe(initialThemeIsDark);
    await themeToggle.click();
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(initialThemeIsDark);
    await statusToggle.click();

    await page.locator('#close-spotify').click();
    await expect(spotifyWindow).toBeHidden();

    await page.waitForTimeout(200);

    const contextStates = await page.evaluate(() => {
      const contexts = (window as any).__spotifyContexts ?? [];
      return contexts.map((ctx: AudioContext & { __closed?: boolean }) => ({
        state: ctx.state,
        closed: Boolean(ctx.__closed) || ctx.state === 'closed',
      }));
    });

    expect(contextStates.length).toBeGreaterThan(0);
    expect(contextStates.every((ctx) => ctx.closed)).toBeTruthy();

    const timerCounts = await page.evaluate(() => {
      const registry = (window as any).__spotifyTimerRegistry;
      if (!registry) {
        return { timeouts: 0, intervals: 0, rafs: 0 };
      }
      return {
        timeouts: registry.timeouts.size,
        intervals: registry.intervals.size,
        rafs: registry.rafs.size,
      };
    });

    expect(timerCounts.timeouts).toBe(0);
    expect(timerCounts.intervals).toBe(0);
    expect(timerCounts.rafs).toBe(0);

    await page.evaluate(() => (window as any).__stopSpotifyTimerTracking?.());

    const metricsEnd = await page.metrics();
    const fpsEnd = metricsEnd.FramesPerSecond ?? metricsEnd.FPS ?? metricsEnd.Frames ?? fpsMid;

    expect(fpsStart).toBeGreaterThan(0);
    expect(fpsMid).toBeGreaterThan(0);
    expect(fpsEnd).toBeGreaterThan(0);

    const fpsValues = [fpsStart, fpsMid, fpsEnd];
    const maxFps = Math.max(...fpsValues);
    const minFps = Math.min(...fpsValues);
    expect(maxFps - minFps).toBeLessThanOrEqual(Math.max(15, maxFps * 0.4));
  });
});
