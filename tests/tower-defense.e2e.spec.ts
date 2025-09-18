import { expect, test, type Page } from '@playwright/test';

const CELL_SIZE = 40;
const WAVES = Array.from({ length: 20 }, () => ['fast']);
const MAPS = [
  Array.from({ length: 10 }, (_, x) => ({ x, y: 5 })),
  [
    { x: 0, y: 5 },
    { x: 1, y: 5 },
    { x: 2, y: 4 },
    { x: 3, y: 4 },
    { x: 4, y: 3 },
    { x: 5, y: 3 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
  ],
] as const;
const FAST_FORWARD_MS = 9000;
const FAST_FORWARD_STEP = 50;

async function getUsedHeap(page: Page) {
  return page.evaluate(() => {
    const memory = (performance as any).memory;
    if (!memory || typeof memory.usedJSHeapSize !== 'number') {
      return null;
    }
    return memory.usedJSHeapSize as number;
  });
}

async function openTowerDefenseWindow(page: Page) {
  const icon = page.getByRole('button', { name: 'Tower Defense' }).first();
  await icon.waitFor({ state: 'visible' });
  await icon.dblclick();
  const windowRoot = page.locator('#tower-defense');
  await expect(windowRoot).toBeVisible();
  const helpClose = windowRoot.getByRole('button', { name: 'Close' });
  if (await helpClose.isVisible()) {
    await helpClose.click();
  }
  return windowRoot;
}

async function drawPath(page: Page, windowRoot: ReturnType<Page['locator']>, cells: ReadonlyArray<{ x: number; y: number }>) {
  const canvas = windowRoot.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Tower Defense canvas is not visible');
  }
  for (const cell of cells) {
    const x = box.x + cell.x * CELL_SIZE + CELL_SIZE / 2;
    const y = box.y + cell.y * CELL_SIZE + CELL_SIZE / 2;
    await page.mouse.click(x, y);
  }
}

test.describe('tower defense endurance', () => {
  test('runs twenty waves on two maps without leaks', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Memory and event timing metrics require Chromium.');

    await page.addInitScript(() => {
      const originalRAF = window.requestAnimationFrame.bind(window);
      const originalCancel = window.cancelAnimationFrame.bind(window);
      const active = new Set<number>();
      (window as any).__getActiveRafCount = () => active.size;
      window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
        const wrapped = (time: number) => {
          active.delete(id);
          callback(time);
        };
        const id = originalRAF(wrapped);
        active.add(id);
        return id;
      }) as typeof window.requestAnimationFrame;
      window.cancelAnimationFrame = ((id: number) => {
        active.delete(id);
        return originalCancel(id);
      }) as typeof window.cancelAnimationFrame;
      (window as any).__eventLatencies = [] as number[];
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const delay = (entry as PerformanceEventTiming).processingStart - entry.startTime;
            if (!Number.isNaN(delay)) {
              (window as any).__eventLatencies.push(delay);
            }
          }
        });
        observer.observe({ type: 'event', durationThreshold: 0 });
        (window as any).__eventObserver = observer;
      } catch (err) {
        // Event timing API not supported; ignore.
      }
    });

    await page.goto('/');

    const firstWindow = await openTowerDefenseWindow(page);
    const baselineMemory = await getUsedHeap(page);
    if (baselineMemory === null) {
      test.skip('performance.memory is not available in this environment.');
    }

    const finishEditingButton = firstWindow.getByRole('button', { name: 'Finish Editing' });
    if (await finishEditingButton.isVisible()) {
      await finishEditingButton.click();
      await firstWindow.getByRole('button', { name: 'Edit Map' }).click();
    }

    await drawPath(page, firstWindow, MAPS[0]);
    const wavesJson = JSON.stringify(WAVES, null, 2);
    await firstWindow.getByRole('textbox').fill(wavesJson);
    await firstWindow.getByRole('button', { name: 'Import' }).click();
    await firstWindow.getByRole('button', { name: 'Start' }).click();

    await page.evaluate(({ waveCount, perWave, step }) => {
      const api = (window as any).__towerDefenseTestApi;
      if (!api || typeof api.fastForward !== 'function') {
        throw new Error('Tower Defense test API is not available.');
      }
      for (let i = 0; i < waveCount; i += 1) {
        api.fastForward(perWave, step);
      }
    }, { waveCount: WAVES.length, perWave: FAST_FORWARD_MS, step: FAST_FORWARD_STEP });

    await page.waitForFunction(() => {
      const api = (window as any).__towerDefenseTestApi;
      if (!api || typeof api.getState !== 'function') return false;
      const state = api.getState();
      return !state.running && state.wave === 20 && state.countdown === null;
    });

    await firstWindow.getByRole('button', { name: 'Export' }).click();
    const savedConfig = await firstWindow.locator('textarea').inputValue();

    await page.locator('#close-tower-defense').click();
    await page.waitForFunction(() => {
      const node = document.querySelector('#tower-defense');
      return !node || node.classList.contains('closed-window');
    });

    await page.reload();

    const secondWindow = await openTowerDefenseWindow(page);
    const secondBaseline = await getUsedHeap(page);
    if (secondBaseline === null) {
      test.skip('performance.memory is not available after reload.');
    }

    await secondWindow.locator('textarea').fill(savedConfig);
    await secondWindow.getByRole('button', { name: 'Import' }).click();
    await expect(secondWindow.getByText('Wave 20')).toBeVisible();

    await drawPath(page, secondWindow, MAPS[1]);
    await secondWindow.getByRole('button', { name: 'Start' }).click();

    await page.evaluate(({ waveCount, perWave, step }) => {
      const api = (window as any).__towerDefenseTestApi;
      if (!api || typeof api.fastForward !== 'function') {
        throw new Error('Tower Defense test API is not available after reload.');
      }
      for (let i = 0; i < waveCount; i += 1) {
        api.fastForward(perWave, step);
      }
    }, { waveCount: WAVES.length, perWave: FAST_FORWARD_MS, step: FAST_FORWARD_STEP });

    await page.waitForFunction(() => {
      const api = (window as any).__towerDefenseTestApi;
      if (!api || typeof api.getState !== 'function') return false;
      const state = api.getState();
      return !state.running && state.wave === 20 && state.countdown === null;
    });

    await page.locator('#close-tower-defense').click();
    await page.waitForFunction(() => {
      const node = document.querySelector('#tower-defense');
      return !node || node.classList.contains('closed-window');
    });

    const activeRafs = await page.evaluate(() => {
      return typeof (window as any).__getActiveRafCount === 'function'
        ? (window as any).__getActiveRafCount()
        : 0;
    });
    expect(activeRafs).toBe(0);

    const finalMemory = await getUsedHeap(page);
    if (finalMemory === null || secondBaseline === null) {
      test.skip('performance.memory is not available for the final assertion.');
    } else {
      const delta = Math.max(0, finalMemory - secondBaseline);
      expect(delta).toBeLessThanOrEqual(10 * 1024 * 1024);
    }

    const latencies = await page.evaluate(() => (window as any).__eventLatencies as number[] | undefined);
    expect(latencies && latencies.length).toBeTruthy();
    if (latencies && latencies.length) {
      const worst = Math.max(...latencies);
      expect(worst).toBeLessThanOrEqual(100);
    }
  });
});
