import { test, expect } from '@playwright/test';

const TEST_DURATION_MS = 2 * 60 * 1000;
const TARGET_FRAME_TIME_MS = 1000 / 60;
const DROP_THRESHOLD_PERCENT = 20;

declare global {
  interface Window {
    __frameTimes?: number[];
  }
}

interface FrameStats {
  dropPercentage: number;
  droppedFrames: number;
  expectedFrames: number;
  averageFps: number;
  durationMs: number;
}

function computeFrameStats(frameTimes: number[]): FrameStats {
  if (frameTimes.length < 2) {
    return {
      dropPercentage: 0,
      droppedFrames: 0,
      expectedFrames: frameTimes.length,
      averageFps: 0,
      durationMs: 0,
    };
  }

  let droppedFrames = 0;
  let expectedFrames = 0;

  for (let i = 1; i < frameTimes.length; i += 1) {
    const delta = frameTimes[i] - frameTimes[i - 1];
    const framesExpected = Math.max(1, Math.round(delta / TARGET_FRAME_TIME_MS));
    expectedFrames += framesExpected;
    droppedFrames += Math.max(0, framesExpected - 1);
  }

  const durationMs = frameTimes[frameTimes.length - 1] - frameTimes[0];
  const averageFps = durationMs > 0 ? frameTimes.length / (durationMs / 1000) : 0;
  const dropPercentage = expectedFrames > 0 ? (droppedFrames / expectedFrames) * 100 : 0;

  return {
    dropPercentage,
    droppedFrames,
    expectedFrames,
    averageFps,
    durationMs,
  };
}

test.describe('Resource monitor stability', () => {
  test('maintains acceptable frame drop percentage', async ({ page }) => {
    test.slow();

    const response = await page.goto('/apps/resource-monitor');

    expect(response, 'Expected a response when loading the resource monitor').not.toBeNull();
    expect(
      response?.ok(),
      `Failed to load resource monitor page: status ${response?.status()}`,
    ).toBeTruthy();

    await page.waitForFunction(() => Array.isArray(window.__frameTimes), {
      timeout: 30_000,
    });

    await page.evaluate(() => {
      if (!Array.isArray(window.__frameTimes)) {
        throw new Error('Resource monitor did not expose window.__frameTimes');
      }
      window.__frameTimes.length = 0;
    });

    await page.waitForTimeout(TEST_DURATION_MS);

    const frameTimes = await page.evaluate(() => {
      if (!Array.isArray(window.__frameTimes)) {
        return null;
      }
      return [...window.__frameTimes];
    });

    expect(frameTimes).not.toBeNull();

    const stats = computeFrameStats(frameTimes ?? []);

    test.info().annotations.push({
      type: 'resource-monitor',
      description: [
        `frames=${frameTimes?.length ?? 0}`,
        `expected=${stats.expectedFrames.toFixed(0)}`,
        `dropped=${stats.droppedFrames.toFixed(0)}`,
        `dropPct=${stats.dropPercentage.toFixed(2)}%`,
        `avgFps=${stats.averageFps.toFixed(2)}`,
      ].join(' | '),
    });

    expect(frameTimes?.length ?? 0).toBeGreaterThan(0);
    expect(stats.dropPercentage).toBeLessThanOrEqual(DROP_THRESHOLD_PERCENT);
  });
});

