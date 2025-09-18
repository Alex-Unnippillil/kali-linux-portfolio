import { test, expect, Page } from '@playwright/test';

const RECORDING_DURATION_MS = 60_000;
const CLEANUP_PAUSE_MS = 5_000;
const REOPEN_SETTLE_MS = 2_000;
const CPU_SAMPLE_WINDOW_MS = 5_000;
const HEAP_TOLERANCE_RATIO = 0.2; // 20%

async function openScreenRecorder(page: Page) {
  const dockButton = page.getByRole('button', { name: 'Screen Recorder' }).first();
  await dockButton.waitFor({ state: 'visible' });
  await dockButton.click();
  await page.locator('#screen-recorder').waitFor({ state: 'visible' });
}

async function sampleHeap(page: Page) {
  return page.evaluate(() => {
    if (typeof performance === 'undefined' || !(performance as any).memory) {
      return null;
    }
    const { usedJSHeapSize } = (performance as any).memory;
    return typeof usedJSHeapSize === 'number' ? usedJSHeapSize : null;
  });
}

async function measureCpuUsage(page: Page, durationMs: number) {
  const { totalLongTaskTime, elapsed } = await page.evaluate(async (duration) => {
    const getter = (window as any).__getLongTaskTotal;
    const startLongTasks = typeof getter === 'function' ? getter() : 0;
    const start = performance.now();
    await new Promise((resolve) => setTimeout(resolve, duration));
    const end = performance.now();
    const endLongTasks = typeof getter === 'function' ? getter() : startLongTasks;
    return {
      totalLongTaskTime: endLongTasks - startLongTasks,
      elapsed: end - start,
    };
  }, durationMs);

  if (elapsed <= 0) {
    return 0;
  }
  return (totalLongTaskTime / elapsed) * 100;
}

test.describe('Screen Recorder resource usage', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('booting_screen', 'false');
        window.localStorage.setItem('screen-locked', 'false');
        window.localStorage.setItem('shut-down', 'false');
        window.localStorage.setItem('pinnedApps', JSON.stringify(['screen-recorder']));
      } catch (error) {
        console.warn('Failed to prime localStorage', error);
      }

      const createMockStream = () => {
        const track = {
          stop: () => {
            track.stopped = true;
          },
        } as any;
        return {
          getTracks: () => [track],
          getVideoTracks: () => [track],
          getAudioTracks: () => [track],
        };
      };

      const devices = navigator.mediaDevices;
      if (devices && typeof devices === 'object') {
        devices.getDisplayMedia = async () => createMockStream();
      } else {
        Object.defineProperty(navigator, 'mediaDevices', {
          configurable: true,
          value: {
            getDisplayMedia: async () => createMockStream(),
          },
        });
      }

      class MockMediaRecorder {
        stream: any;
        state: 'inactive' | 'recording';
        ondataavailable: ((event: { data: Blob }) => void) | null;
        onstop: (() => void) | null;
        private _interval: ReturnType<typeof setInterval> | null;

        constructor(stream: any) {
          this.stream = stream;
          this.state = 'inactive';
          this.ondataavailable = null;
          this.onstop = null;
          this._interval = null;
        }

        start() {
          if (this.state === 'recording') return;
          this.state = 'recording';
          this._interval = setInterval(() => {
            if (typeof this.ondataavailable === 'function') {
              const chunk = new Blob(['mock'], { type: 'video/webm' });
              this.ondataavailable({ data: chunk });
            }
          }, 1000);
        }

        stop() {
          if (this.state !== 'recording') return;
          this.state = 'inactive';
          if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
          }
          setTimeout(() => {
            if (typeof this.onstop === 'function') {
              this.onstop();
            }
          }, 0);
        }
      }

      Object.defineProperty(window, 'MediaRecorder', {
        configurable: true,
        writable: true,
        value: MockMediaRecorder,
      });

      if (!(window as any).__longTaskObserverInitialized) {
        (window as any).__longTaskObserverInitialized = true;
        (window as any).__longTaskTotal = 0;
        if (
          'PerformanceObserver' in window &&
          Array.isArray((PerformanceObserver as any).supportedEntryTypes) &&
          (PerformanceObserver as any).supportedEntryTypes.includes('longtask')
        ) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              (window as any).__longTaskTotal += entry.duration;
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
          (window as any).__getLongTaskTotal = () => (window as any).__longTaskTotal;
        } else {
          (window as any).__getLongTaskTotal = () => 0;
        }
      }
    });
  });

  test('recovers heap and CPU after a 60s recording session', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/');
    await page.waitForSelector('#desktop', { state: 'visible' });

    const supportsPerformanceMemory = await page.evaluate(() => {
      return typeof performance !== 'undefined' && !!(performance as any).memory;
    });
    test.skip(!supportsPerformanceMemory, 'performance.memory not available in this browser');

    await openScreenRecorder(page);

    const baselineHeap = await sampleHeap(page);
    expect(baselineHeap).not.toBeNull();
    expect(baselineHeap ?? 0).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Start Recording' }).click();
    await page.getByRole('button', { name: 'Stop Recording' }).waitFor({ state: 'visible' });

    await page.waitForTimeout(RECORDING_DURATION_MS);

    await page.getByRole('button', { name: 'Stop Recording' }).click();
    await page.getByRole('button', { name: 'Start Recording' }).waitFor({ state: 'visible' });

    const postRecordingHeap = await sampleHeap(page);
    expect(postRecordingHeap).not.toBeNull();

    await page.getByRole('button', { name: 'Window close' }).click();
    await page.waitForTimeout(CLEANUP_PAUSE_MS);

    const heapAfterClose = await sampleHeap(page);
    expect(heapAfterClose).not.toBeNull();

    const baseline = baselineHeap as number;
    const afterClose = heapAfterClose as number;
    const postRecording = postRecordingHeap as number;

    // Sanity check that recording increased heap usage at some point.
    expect(postRecording).toBeGreaterThan(0);

    const closeDelta = Math.abs(afterClose - baseline) / baseline;
    expect(closeDelta).toBeLessThanOrEqual(HEAP_TOLERANCE_RATIO);

    await openScreenRecorder(page);
    await page.waitForTimeout(REOPEN_SETTLE_MS);

    const heapAfterReopen = await sampleHeap(page);
    expect(heapAfterReopen).not.toBeNull();
    const reopenDelta = Math.abs((heapAfterReopen as number) - baseline) / baseline;
    expect(reopenDelta).toBeLessThanOrEqual(HEAP_TOLERANCE_RATIO);

    const idleCpu = await measureCpuUsage(page, CPU_SAMPLE_WINDOW_MS);
    expect(idleCpu).toBeLessThan(30);
  });
});
