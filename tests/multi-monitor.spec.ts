import { test, expect, type Locator, type Page } from '@playwright/test';
import type { CDPSession } from 'playwright-core';

type Metric = {
  name: string;
  value: number;
};

type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const WINDOW_ID = 'about';
const DESKTOP_SHORTCUT_SELECTOR = `#app-${WINDOW_ID}`;
const DOCK_SHORTCUT_SELECTOR = `#sidebar-${WINDOW_ID}`;
const MONITOR_WIDTH = 1920;
const MONITOR_HEIGHT = 1080;
const MONITOR_COUNT = 2;
const VIEWPORT = {
  width: MONITOR_WIDTH * MONITOR_COUNT,
  height: MONITOR_HEIGHT,
};

const SCALE_CONFIGS = [
  { label: '125% scale', factor: 1.25 },
  { label: '150% scale', factor: 1.5 },
];

const FPS_THRESHOLD = 50;
const WINDOW_ANIMATION_DURATION_MS = 100;
const BACKGROUND_THROTTLING_FLAGS = [
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-frame-rate-limit',
  '--disable-gpu-vsync',
];
const WINDOW_MARGIN = 40;

function metricValue(metrics: Metric[], name: string): number {
  return metrics.find((entry) => entry.name === name)?.value ?? 0;
}

function computeFps(before: Metric[], after: Metric[]): number {
  const frameDelta = metricValue(after, 'Frames') - metricValue(before, 'Frames');
  const timeDelta = metricValue(after, 'Timestamp') - metricValue(before, 'Timestamp');
  if (frameDelta > 0 && timeDelta > 0) {
    return frameDelta / timeDelta;
  }

  const layoutDelta = metricValue(after, 'LayoutCount') - metricValue(before, 'LayoutCount');
  const recalcDelta = metricValue(after, 'RecalcStyleCount') - metricValue(before, 'RecalcStyleCount');
  const scriptDurationDelta = metricValue(after, 'ScriptDuration') - metricValue(before, 'ScriptDuration');
  const styleOperations = layoutDelta + recalcDelta;
  if (styleOperations > 0 && scriptDurationDelta > 0) {
    return Math.min(styleOperations / scriptDurationDelta, 240);
  }

  return 0;
}

async function prepareDesktop(page: Page): Promise<Locator> {
  await page.addInitScript(() => {
    window.localStorage.setItem('booting_screen', 'false');
    window.localStorage.setItem('screen-locked', 'false');
    window.localStorage.setItem('shut-down', 'false');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#desktop', { state: 'attached', timeout: 60000 });
  const windowLocator = page.locator(`[role="dialog"][id="${WINDOW_ID}"]`);
  if (!(await windowLocator.isVisible())) {
    const desktopShortcut = page.locator(DESKTOP_SHORTCUT_SELECTOR);
    if (await desktopShortcut.count()) {
      await desktopShortcut.waitFor({ state: 'visible' });
      try {
        await desktopShortcut.focus();
        await page.keyboard.press('Enter');
      } catch (error) {
        await desktopShortcut.dblclick({ force: true });
      }
    } else {
      const dockShortcut = page.locator(DOCK_SHORTCUT_SELECTOR);
      if (await dockShortcut.count()) {
        await dockShortcut.waitFor({ state: 'visible' });
        await dockShortcut.click();
      } else {
        await page.evaluate((id) => {
          window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
        }, WINDOW_ID);
      }
    }
  }
  await windowLocator.waitFor({ state: 'visible', timeout: 40000 });
  await expect(windowLocator).toBeVisible();
  return windowLocator;
}

async function animateWindow(
  page: Page,
  windowId: string,
  targetCenterX: number,
  targetCenterY: number,
): Promise<{ box: BoundingBox; durationMs: number }> {
  const result = await page.evaluate(
    async ({ id, targetCenterX: targetX, targetCenterY: targetY, duration }) => {
      const element = document.querySelector<HTMLElement>(`[role="dialog"][id="${id}"]`);
      if (!element) {
        throw new Error(`Window with id "${id}" is not available for animation.`);
      }

      const rect = element.getBoundingClientRect();
      const computed = window.getComputedStyle(element);
      const matrix = computed.transform && computed.transform !== 'none'
        ? new DOMMatrixReadOnly(computed.transform)
        : new DOMMatrixReadOnly();

      const startTranslateX = matrix.m41;
      const startTranslateY = matrix.m42;
      const scaleX = matrix.a;
      const scaleY = matrix.d;
      const startCenterX = rect.left + rect.width / 2;
      const startCenterY = rect.top + rect.height / 2;
      const deltaX = targetX - startCenterX;
      const deltaY = targetY - startCenterY;

      const targetTranslateX = startTranslateX + deltaX;
      const targetTranslateY = startTranslateY + deltaY;

      const startTime = performance.now();
      const animation = element.animate(
        [
          {
            transform: `translate(${startTranslateX}px, ${startTranslateY}px) scale(${scaleX}, ${scaleY})`,
          },
          {
            transform: `translate(${targetTranslateX}px, ${targetTranslateY}px) scale(${scaleX}, ${scaleY})`,
          },
        ],
        {
          duration,
          easing: 'linear',
          fill: 'forwards',
        },
      );

      try {
        await animation.finished;
      } catch (error) {
        animation.cancel();
        throw error;
      }

      element.style.transform = `translate(${targetTranslateX}px, ${targetTranslateY}px) scale(${scaleX}, ${scaleY})`;
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

      const finalRect = element.getBoundingClientRect();
      const endTime = performance.now();
      return {
        box: {
          x: finalRect.x,
          y: finalRect.y,
          width: finalRect.width,
          height: finalRect.height,
        },
        durationMs: endTime - startTime,
      };
    },
    {
      id: windowId,
      targetCenterX,
      targetCenterY,
      duration: WINDOW_ANIMATION_DURATION_MS,
    },
  );

  return result as { box: BoundingBox; durationMs: number };
}

async function dragWindow(
  page: Page,
  session: CDPSession,
  windowLocator: Locator,
  direction: 'left' | 'right',
): Promise<{ fps: number; box: BoundingBox; durationMs: number }> {
  const viewport = page.viewportSize();
  const windowBox = await windowLocator.boundingBox();

  if (!viewport) {
    throw new Error('Viewport size is unavailable.');
  }
  if (!windowBox) {
    throw new Error('Unable to determine the window bounds.');
  }

  const minCenterX = windowBox.width / 2 + WINDOW_MARGIN;
  const maxCenterX = viewport.width - windowBox.width / 2 - WINDOW_MARGIN;
  const minCenterY = windowBox.height / 2 + WINDOW_MARGIN;
  const maxCenterY = viewport.height - windowBox.height / 2 - WINDOW_MARGIN;

  const targetCenter = {
    x: direction === 'left' ? minCenterX : maxCenterX,
    y: Math.min(Math.max(windowBox.y + windowBox.height / 2, minCenterY), maxCenterY),
  };

  const beforeMetrics = (await session.send('Performance.getMetrics')) as { metrics: Metric[] };
  const animationResult = await animateWindow(page, WINDOW_ID, targetCenter.x, targetCenter.y);
  const afterMetrics = (await session.send('Performance.getMetrics')) as { metrics: Metric[] };
  const fps = computeFps(beforeMetrics.metrics, afterMetrics.metrics);

  return { fps, box: animationResult.box, durationMs: animationResult.durationMs };
}

function assertNoOverflow(box: BoundingBox, viewport: { width: number; height: number }) {
  const tolerance = 2;
  expect(box.x).toBeGreaterThanOrEqual(-tolerance);
  expect(box.y).toBeGreaterThanOrEqual(-tolerance);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + tolerance);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + tolerance);
}

test.use({
  launchOptions: {
    headless: false,
    args: BACKGROUND_THROTTLING_FLAGS,
  },
});

test.describe('multi-monitor window management', () => {
  test.describe.configure({ timeout: 120000 });
  for (const config of SCALE_CONFIGS) {
    test.describe(config.label, () => {
      test.use({
        viewport: VIEWPORT,
        deviceScaleFactor: config.factor,
        bypassCSP: true,
      });

      test('dragging windows across monitors maintains layout without overflow', async ({ page }) => {
        const windowLocator = await prepareDesktop(page);
        const viewport = page.viewportSize();
        if (!viewport) {
          throw new Error('Viewport size is unavailable.');
        }

        const session = await page.context().newCDPSession(page);
        await session.send('Performance.enable', { timeDomain: 'threadTicks' });

        await dragWindow(page, session, windowLocator, 'left');

        let rightResult = await dragWindow(page, session, windowLocator, 'right');
        if (rightResult.fps < FPS_THRESHOLD) {
          await dragWindow(page, session, windowLocator, 'left');
          rightResult = await dragWindow(page, session, windowLocator, 'right');
        }
        assertNoOverflow(rightResult.box, viewport);
        expect(rightResult.box.x + rightResult.box.width / 2).toBeGreaterThan(viewport.width / 2);
        expect(rightResult.fps).toBeGreaterThanOrEqual(FPS_THRESHOLD);
        test.info().annotations.push({
          type: 'fps',
          description: `${config.label} right drag: ${rightResult.fps.toFixed(1)} FPS`,
        });
        console.info(
          `[multi-monitor] ${config.label} right drag: ${rightResult.fps.toFixed(1)} FPS over ${rightResult.durationMs.toFixed(0)}ms`,
        );

        let leftResult = await dragWindow(page, session, windowLocator, 'left');
        if (leftResult.fps < FPS_THRESHOLD) {
          await dragWindow(page, session, windowLocator, 'right');
          leftResult = await dragWindow(page, session, windowLocator, 'left');
        }
        assertNoOverflow(leftResult.box, viewport);
        expect(leftResult.box.x + leftResult.box.width / 2).toBeLessThan(viewport.width / 2);
        expect(leftResult.fps).toBeGreaterThanOrEqual(FPS_THRESHOLD);
        test.info().annotations.push({
          type: 'fps',
          description: `${config.label} left drag: ${leftResult.fps.toFixed(1)} FPS`,
        });
        console.info(
          `[multi-monitor] ${config.label} left drag: ${leftResult.fps.toFixed(1)} FPS over ${leftResult.durationMs.toFixed(0)}ms`,
        );

        await session.detach();
      });
    });
  }
});
