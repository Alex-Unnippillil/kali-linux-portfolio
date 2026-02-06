import { test, expect } from '@playwright/test';

type FrameMetrics = {
  frames: number;
  duration: number;
  fps: number;
};

const THEME_OPTIONS = ['default', 'dark', 'neon', 'matrix'] as const;
const ACCENT_OPTIONS = [
  '#1793d1',
  '#e53e3e',
  '#d97706',
  '#38a169',
  '#805ad5',
  '#ed64a6',
] as const;
const DENSITY_OPTIONS = ['regular', 'compact'] as const;
const ITERATIONS = 200;

const FIVE_MB = 5 * 1024 * 1024;

test.describe('settings performance', () => {
  test('toggling theme, accent, and density stays within memory budget', async ({ page }) => {
    await page.goto('/apps/settings');
    await page.waitForLoadState('networkidle');

    const appearanceTab = page.getByRole('tab', { name: 'Appearance' });
    const accessibilityTab = page.getByRole('tab', { name: 'Accessibility' });

    await appearanceTab.click();

    const themeSelect = page
      .locator('select')
      .filter({ has: page.locator('option[value="matrix"]') });
    await themeSelect.waitFor();

    const accentRadios = page.locator('button[role="radio"][aria-label^="select-accent-"]');
    await expect(accentRadios).toHaveCount(ACCENT_OPTIONS.length);

    const initialMemory = await page.evaluate(() => {
      const memory = (performance as any).memory as
        | { usedJSHeapSize: number }
        | undefined;
      return memory ? memory.usedJSHeapSize : null;
    });
    test.skip(initialMemory === null, 'performance.memory not available in this browser');

    await page.evaluate(() => {
      if (!(window as any).__frameMeter) {
        (window as any).__frameMeter = (() => {
          let frames = 0;
          let start = 0;
          let running = false;
          const step = () => {
            if (!running) return;
            frames += 1;
            requestAnimationFrame(step);
          };
          return {
            start() {
              frames = 0;
              start = performance.now();
              running = true;
              requestAnimationFrame(step);
            },
            stop() {
              running = false;
              const duration = performance.now() - start;
              const fps = duration > 0 ? (frames * 1000) / duration : 0;
              return { frames, duration, fps };
            },
          };
        })();
      }
      (window as any).__frameMeter.start();
    });

    for (let i = 0; i < ITERATIONS; i += 1) {
      const themeValue = THEME_OPTIONS[(i + 1) % THEME_OPTIONS.length];
      await themeSelect.selectOption(themeValue);

      const accentIndex = (i + 1) % ACCENT_OPTIONS.length;
      await accentRadios.nth(accentIndex).click({ force: true });
      await page.waitForTimeout(0);
    }

    await accessibilityTab.click();

    const densitySelect = page
      .locator('select')
      .filter({ has: page.locator('option[value="compact"]') });
    await densitySelect.waitFor();

    for (let i = 0; i < ITERATIONS; i += 1) {
      const densityValue = DENSITY_OPTIONS[(i + 1) % DENSITY_OPTIONS.length];
      await densitySelect.selectOption(densityValue);
      await page.waitForTimeout(0);
    }

    const frameStats = await page.evaluate<FrameMetrics>(() => (window as any).__frameMeter.stop());
    expect(frameStats.frames).toBeGreaterThan(0);
    expect(frameStats.duration).toBeGreaterThan(0);

    test.info().annotations.push({
      type: 'frame-rate',
      description: `Frames: ${frameStats.frames}, Duration: ${frameStats.duration.toFixed(1)}ms, FPS: ${frameStats.fps.toFixed(1)}`,
    });

    const finalMemory = await page.evaluate(() => {
      const memory = (performance as any).memory as
        | { usedJSHeapSize: number }
        | undefined;
      return memory ? memory.usedJSHeapSize : null;
    });

    expect(finalMemory).not.toBeNull();

    const memoryDelta = (finalMemory as number) - (initialMemory as number);
    test.info().annotations.push({
      type: 'memory-delta',
      description: `Heap delta ${(memoryDelta / (1024 * 1024)).toFixed(2)} MB`,
    });

    expect(memoryDelta).toBeLessThan(FIVE_MB);
  });
});
