import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const installRafMonitor = async (page: Page) => {
  await page.evaluate(() => {
    const win = window as Window & {
      __rafMonitorInstalled?: boolean;
      __rafCounts?: { frames: number };
    };
    if (win.__rafMonitorInstalled) return;
    const original = win.requestAnimationFrame.bind(win);
    const counts = { frames: 0 };
    win.__rafCounts = counts;
    win.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      original((time) => {
        counts.frames += 1;
        return callback(time);
      })) as typeof win.requestAnimationFrame;
    win.__rafMonitorInstalled = true;
  });
};

const measureFrames = async (page: Page, duration: number) =>
  page.evaluate(async (ms) => {
    const win = window as Window & { __rafCounts?: { frames: number } };
    if (!win.__rafCounts) {
      throw new Error('RAF monitor not installed');
    }
    win.__rafCounts.frames = 0;
    await new Promise((resolve) => setTimeout(resolve, ms));
    return win.__rafCounts.frames;
  }, duration);

test('resource monitor pauses sampling when minimized', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#window-area', { state: 'visible' });

  await installRafMonitor(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: 'resource-monitor' }));
  });

  await page.locator('#resource-monitor').waitFor({ state: 'visible' });
  await page.waitForFunction(
    () => !document.querySelector('#resource-monitor')?.classList.contains('invisible'),
  );

  const framesWhileVisible = await measureFrames(page, 700);
  expect(framesWhileVisible).toBeGreaterThan(5);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('minimize-app', { detail: 'resource-monitor' }));
  });

  await page.waitForFunction(() =>
    document.querySelector('#resource-monitor')?.classList.contains('invisible'),
  );

  const framesWhileHidden = await measureFrames(page, 700);

  expect(framesWhileHidden).toBeLessThan(2);
  expect(framesWhileHidden).toBeLessThan(framesWhileVisible / 8);
});
