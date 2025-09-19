import { test, expect, Page, Locator } from '@playwright/test';
import { spawn } from 'child_process';

type CommandStep = {
  title: string;
  command: string;
  args: string[];
};

type LayoutMetric = {
  action: string;
  delta: number;
};

type ConsoleEntry = {
  type: string;
  text: string;
};

const QUALITY_PIPELINE: CommandStep[] = [
  { title: 'tsc --noEmit', command: 'yarn', args: ['tsc', '--noEmit'] },
  { title: 'eslint --max-warnings=0', command: 'yarn', args: ['eslint', '.', '--max-warnings=0'] },
  { title: 'next build', command: 'yarn', args: ['next', 'build'] },
];

const LAYOUT_SHIFT_THRESHOLD = 2;

const APPS_UNDER_TEST = [
  { id: 'chrome', title: 'Google Chrome' },
  { id: 'terminal', title: 'Terminal' },
  { id: 'spotify', title: 'Spotify' },
  { id: 'todoist', title: 'Todoist' },
  { id: 'gedit', title: 'Contact Me' },
  { id: 'resource-monitor', title: 'Resource Monitor' },
];

async function runCommand(step: CommandStep): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(step.command, step.args, { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${step.title}" exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

async function openAppWindow(page: Page, appId: string): Promise<Locator> {
  await page.evaluate((id) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
  }, appId);
  const locator = page.locator(`[id="${appId}"]`);
  await locator.waitFor({ state: 'visible' });
  return locator;
}

async function ensureDragHandles(page: Page, windowId: string): Promise<void> {
  await page.evaluate((id) => {
    const root = document.getElementById(id);
    if (!root) return;
    const elements = Array.from(root.querySelectorAll('div')) as HTMLElement[];
    for (const element of elements) {
      const className = typeof element.className === 'string' ? element.className : '';
      if (className.includes('windowYBorder') || className.includes('windowXBorder')) {
        element.setAttribute('draggable', 'true');
      }
    }
  }, windowId);
}

async function dragEdge(
  page: Page,
  windowLocator: Locator,
  edge: 'left' | 'right' | 'top' | 'bottom',
  offset: number,
): Promise<void> {
  const handle =
    edge === 'left' || edge === 'right'
      ? windowLocator.locator('[class*="windowYBorder"]')
      : windowLocator.locator('[class*="windowXBorder"]');
  await handle.waitFor({ state: 'visible' });
  const box = await handle.boundingBox();
  if (!box) {
    throw new Error(`Failed to obtain bounding box for ${edge} handle`);
  }

  let startX = box.x + box.width / 2;
  let startY = box.y + box.height / 2;
  if (edge === 'left') {
    startX = box.x + 4;
  } else if (edge === 'right') {
    startX = box.x + box.width - 4;
  } else if (edge === 'top') {
    startY = box.y + 4;
  } else if (edge === 'bottom') {
    startY = box.y + box.height - 4;
  }

  const deltaX = edge === 'left' || edge === 'right' ? offset : 0;
  const deltaY = edge === 'top' || edge === 'bottom' ? offset : 0;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
  await page.mouse.up();
}

async function getWindowSize(page: Page, windowId: string): Promise<{ width: number; height: number }> {
  return page.evaluate((id) => {
    const element = document.getElementById(id) as HTMLElement | null;
    if (!element) {
      throw new Error(`Window ${id} not found`);
    }
    const width = parseFloat(element.style.width);
    const height = parseFloat(element.style.height);
    if (!Number.isNaN(width) && !Number.isNaN(height)) {
      return { width, height };
    }
    const computed = window.getComputedStyle(element);
    return {
      width: parseFloat(computed.width),
      height: parseFloat(computed.height),
    };
  }, windowId);
}

async function getLayoutShiftScore(page: Page): Promise<number> {
  return page.evaluate(() => {
    const entries = performance.getEntriesByType('layoutShift') as PerformanceEntry[];
    return entries.reduce((total, entry) => {
      const value = (entry as unknown as { value?: number }).value;
      return typeof value === 'number' ? total + value : total;
    }, 0);
  });
}

async function withLayoutMeasurement<T>(
  page: Page,
  metrics: LayoutMetric[],
  label: string,
  action: () => Promise<T>,
  threshold: number = LAYOUT_SHIFT_THRESHOLD,
): Promise<T> {
  const before = await getLayoutShiftScore(page);
  const result = await action();
  const after = await getLayoutShiftScore(page);
  const delta = after - before;
  metrics.push({ action: label, delta });
  expect(delta, `${label} triggered layout shift delta ${delta.toFixed(3)}`).toBeLessThanOrEqual(threshold);
  return result;
}

test.describe.configure({ mode: 'serial' });

test.describe('window chrome regression gate', () => {
  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(600_000);
    for (const step of QUALITY_PIPELINE) {
      console.log(`Running quality gate: ${step.title}`);
      await runCommand(step);
    }
  });

  test('opens, resizes, maximizes, fullscreens, and restores without thrash', async ({ page }, testInfo) => {
    testInfo.setTimeout(600_000);

    const consoleEntries: ConsoleEntry[] = [];
    const reactWarnings: ConsoleEntry[] = [];
    const layoutMetrics: LayoutMetric[] = [];

    page.on('console', (message) => {
      const entry: ConsoleEntry = { type: message.type(), text: message.text() };
      consoleEntries.push(entry);
      if (
        message.type() === 'warning' ||
        message.type() === 'error' ||
        /Warning:/i.test(message.text())
      ) {
        if (/react/i.test(message.text()) || /Warning:/i.test(message.text())) {
          reactWarnings.push(entry);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#desktop')).toBeVisible();
    await page.evaluate(() => performance.mark?.('window-chrome-gate-start'));

    const initialCloseButton = page.locator('[aria-label="Window close"]').first();
    if (await initialCloseButton.isVisible()) {
      await initialCloseButton.click();
      await page.waitForTimeout(400);
    }

    for (const app of APPS_UNDER_TEST) {
      await test.step(`exercise ${app.title}`, async () => {
        const windowLocator = await openAppWindow(page, app.id);
        await windowLocator.waitFor({ state: 'visible' });
        await windowLocator.scrollIntoViewIfNeeded();
        await windowLocator.click({ position: { x: 48, y: 48 } });
        await ensureDragHandles(page, app.id);

        const initialSize = await getWindowSize(page, app.id);

        await withLayoutMeasurement(page, layoutMetrics, `${app.id} shrink left edge`, async () => {
          const before = await getWindowSize(page, app.id);
          await dragEdge(page, windowLocator, 'left', 80);
          await page.waitForTimeout(200);
          const after = await getWindowSize(page, app.id);
          expect(before.width - after.width).toBeGreaterThan(0.25);
        });

        await withLayoutMeasurement(page, layoutMetrics, `${app.id} expand right edge`, async () => {
          const before = await getWindowSize(page, app.id);
          await dragEdge(page, windowLocator, 'right', 80);
          await page.waitForTimeout(200);
          const after = await getWindowSize(page, app.id);
          expect(after.width - before.width).toBeGreaterThan(0.25);
        });

        await withLayoutMeasurement(page, layoutMetrics, `${app.id} lower top edge`, async () => {
          const before = await getWindowSize(page, app.id);
          await dragEdge(page, windowLocator, 'top', 60);
          await page.waitForTimeout(200);
          const after = await getWindowSize(page, app.id);
          expect(before.height - after.height).toBeGreaterThan(0.25);
        });

        await withLayoutMeasurement(page, layoutMetrics, `${app.id} extend bottom edge`, async () => {
          const before = await getWindowSize(page, app.id);
          await dragEdge(page, windowLocator, 'bottom', 80);
          await page.waitForTimeout(200);
          const after = await getWindowSize(page, app.id);
          expect(after.height - before.height).toBeGreaterThan(0.25);
        });

        await withLayoutMeasurement(page, layoutMetrics, `${app.id} maximize`, async () => {
          const maximizeButton = windowLocator.getByRole('button', { name: 'Window maximize' });
          await expect(maximizeButton).toBeVisible();
          await maximizeButton.click();
          await expect(windowLocator.getByRole('button', { name: 'Window restore' })).toBeVisible();
          await page.waitForTimeout(300);
          const maximized = await getWindowSize(page, app.id);
          expect(maximized.width).toBeGreaterThan(90);
          expect(maximized.height).toBeGreaterThan(90);
        });

        await withLayoutMeasurement(page, layoutMetrics, `${app.id} restore`, async () => {
          const restoreButton = windowLocator.getByRole('button', { name: 'Window restore' });
          await restoreButton.click();
          await expect(windowLocator.getByRole('button', { name: 'Window maximize' })).toBeVisible();
          await page.waitForTimeout(400);
          const restored = await getWindowSize(page, app.id);
          expect(Math.abs(restored.width - initialSize.width)).toBeLessThan(1);
          expect(Math.abs(restored.height - initialSize.height)).toBeLessThan(1);
        });

        const closeButton = windowLocator.getByRole('button', { name: 'Window close' });
        await closeButton.click();
        await windowLocator.waitFor({ state: 'detached' });
        await page.waitForTimeout(200);
      });
    }

    await test.step('toggle desktop fullscreen', async () => {
      const desktop = page.locator('#desktop');

      await withLayoutMeasurement(page, layoutMetrics, 'desktop enter fullscreen', async () => {
        await desktop.click({ button: 'right', position: { x: 200, y: 200 } });
        const enterFullscreen = page.getByRole('menuitem', { name: /Enter Full Screen/i });
        await expect(enterFullscreen).toBeVisible();
        await enterFullscreen.click();
        await page.waitForFunction(() => document.fullscreenElement !== null);
        await page.waitForTimeout(200);
      });

      await withLayoutMeasurement(page, layoutMetrics, 'desktop exit fullscreen', async () => {
        await desktop.click({ button: 'right', position: { x: 220, y: 220 } });
        const exitFullscreen = page.getByRole('menuitem', { name: /Exit Full Screen/i });
        await expect(exitFullscreen).toBeVisible();
        await exitFullscreen.click();
        await page.waitForFunction(() => document.fullscreenElement === null);
        await page.waitForTimeout(200);
      });
    });

    await page.waitForTimeout(300);
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('window-chrome-desktop', { body: screenshot, contentType: 'image/png' });

    await testInfo.attach(
      'window-chrome-metrics',
      {
        body: Buffer.from(
          JSON.stringify(
            {
              consoleEntries,
              reactWarnings,
              layoutMetrics,
            },
            null,
            2,
          ),
        ),
        contentType: 'application/json',
      },
    );

    expect(reactWarnings, 'React warnings detected in console output').toHaveLength(0);
  });
});
