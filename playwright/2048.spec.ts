import { expect, test } from '@playwright/test';

const FRAME_MAX_THRESHOLD_MS = 50;
const HEAP_TOLERANCE_BYTES = 5 * 1024 * 1024;

const registerListenerTracker = () => {
  const summaryCounts = new WeakMap<EventTarget, Map<string, number>>();
  const detailCounts = new WeakMap<EventTarget, Map<string, number>>();
  const onceWrappers = new WeakMap<EventTarget, Map<string, EventListener>>();
  const listenerIds = new WeakMap<object, number>();
  let listenerIdCounter = 0;

  const getSummary = (target: EventTarget) => {
    let summary = summaryCounts.get(target);
    if (!summary) {
      summary = new Map();
      summaryCounts.set(target, summary);
    }
    return summary;
  };

  const getDetail = (target: EventTarget) => {
    let detail = detailCounts.get(target);
    if (!detail) {
      detail = new Map();
      detailCounts.set(target, detail);
    }
    return detail;
  };

  const getWrapperMap = (target: EventTarget) => {
    let wrappers = onceWrappers.get(target);
    if (!wrappers) {
      wrappers = new Map();
      onceWrappers.set(target, wrappers);
    }
    return wrappers;
  };

  const getListenerKey = (listener: EventListenerOrEventListenerObject | null) => {
    if (!listener || (typeof listener !== 'function' && typeof listener !== 'object')) {
      return `primitive:${String(listener)}`;
    }
    const keyTarget = listener as object;
    let id = listenerIds.get(keyTarget);
    if (!id) {
      listenerIdCounter += 1;
      id = listenerIdCounter;
      listenerIds.set(keyTarget, id);
    }
    return `id:${id}`;
  };

  const getOptionsKey = (options?: boolean | AddEventListenerOptions | null) => {
    if (options === undefined || options === null) {
      return 'opts:0:0:0';
    }
    if (typeof options === 'boolean') {
      return `opts:${options ? 1 : 0}:0:0`;
    }
    const capture = options.capture ? 1 : 0;
    const once = options.once ? 1 : 0;
    const passive = options.passive ? 1 : 0;
    return `opts:${capture}:${once}:${passive}`;
  };

  const buildKey = (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | null,
  ) => `${type}:${getListenerKey(listener)}:${getOptionsKey(options)}`;

  const cleanup = (target: EventTarget, type: string, key: string) => {
    const detail = detailCounts.get(target);
    if (!detail || !detail.has(key)) {
      return;
    }
    detail.delete(key);
    const summary = summaryCounts.get(target);
    if (!summary) {
      return;
    }
    const current = summary.get(type) || 0;
    if (current <= 1) {
      summary.delete(type);
      if (summary.size === 0) {
        summaryCounts.delete(target);
      }
    } else {
      summary.set(type, current - 1);
    }
  };

  const patchTarget = (target: EventTarget) => {
    const originalAdd = target.addEventListener;
    const originalRemove = target.removeEventListener;
    if (!originalAdd || !originalRemove) {
      return;
    }

    target.addEventListener = function patchedAdd(
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions | null,
    ) {
      const key = buildKey(type, listener, options);
      const detail = getDetail(this);
      const summary = getSummary(this);

      if (!detail.has(key)) {
        detail.set(key, 1);
        summary.set(type, (summary.get(type) || 0) + 1);
        const once = typeof options === 'boolean' ? options : !!options?.once;
        let actualListener = listener as EventListener;
        let wrapper: EventListener | null = null;

        if (once && listener) {
          wrapper = function onceWrapper(this: EventTarget, event: Event) {
            try {
              if (typeof listener === 'function') {
                return listener.call(this, event);
              }
              if (listener && typeof (listener as EventListenerObject).handleEvent === 'function') {
                return (listener as EventListenerObject).handleEvent.call(listener, event);
              }
              return undefined;
            } finally {
              cleanup(this, type, key);
              const wrappers = onceWrappers.get(this);
              wrappers?.delete(key);
            }
          };
          actualListener = wrapper;
          getWrapperMap(this).set(key, wrapper);
        }

        try {
          return originalAdd.call(this, type, actualListener, options);
        } catch (error) {
          detail.delete(key);
          const current = summary.get(type) || 0;
          if (current <= 1) {
            summary.delete(type);
          } else {
            summary.set(type, current - 1);
          }
          if (wrapper) {
            const wrappers = onceWrappers.get(this);
            wrappers?.delete(key);
          }
          throw error;
        }
      }

      return originalAdd.call(this, type, listener as EventListener, options);
    };

    target.removeEventListener = function patchedRemove(
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions | null,
    ) {
      const key = buildKey(type, listener, options);
      let actualListener = listener as EventListener;
      const wrappers = onceWrappers.get(this);
      if (wrappers && wrappers.has(key)) {
        actualListener = wrappers.get(key) as EventListener;
        wrappers.delete(key);
      }

      try {
        return originalRemove.call(this, type, actualListener, options);
      } finally {
        cleanup(this, type, key);
      }
    };
  };

  patchTarget(window);
  patchTarget(document);

  (window as any).__listenerTracker = {
    snapshot() {
      const toObject = (target: EventTarget) => {
        const summary = summaryCounts.get(target);
        const result: Record<string, number> = {};
        if (!summary) {
          return result;
        }
        summary.forEach((value, key) => {
          if (value > 0) {
            result[key] = value;
          }
        });
        return result;
      };

      return {
        window: toObject(window),
        document: toObject(document),
      };
    },
  };
};

test('2048 autoplay is memory and event listener stable', async ({ page }) => {
  await page.addInitScript(registerListenerTracker);

  await page.goto('/');
  await page.waitForSelector('#window-area');
  await page.waitForSelector('#about-alex');

  const baselineListeners = await page.evaluate(() => {
    return (window as any).__listenerTracker?.snapshot() ?? null;
  });

  const baselineHeap = await page.evaluate(() => {
    const memory = (performance as any).memory;
    return memory ? memory.usedJSHeapSize : null;
  });

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: '2048' }));
  });

  const windowRoot = page.locator('#2048');
  await expect(windowRoot).toBeVisible();

  const restartButton = windowRoot.getByRole('button', { name: 'Restart' });
  const closeButton = windowRoot.getByRole('button', { name: 'Close' });

  await expect(restartButton).toBeVisible();
  await expect(closeButton).toBeVisible();

  await page.waitForFunction(() => {
    const root = document.getElementById('2048');
    if (!root) return false;
    const cells = Array.from(root.querySelectorAll('.grid div div'));
    return cells.some((cell) => cell.textContent?.trim());
  });

  await page.locator('#2048 .grid').first().click();

  const moves = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
  for (let i = 0; i < 100; i += 1) {
    await page.keyboard.press(moves[i % moves.length]);
    await page.waitForTimeout(20);
  }

  const frameMetrics = await page.evaluate(async () => {
    const durations: number[] = [];
    let last = performance.now();
    for (let i = 0; i < 60; i += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame((time) => {
          durations.push(time - last);
          last = time;
          resolve();
        });
      });
    }
    const total = durations.reduce((sum, value) => sum + value, 0);
    const average = durations.length ? total / durations.length : 0;
    const max = durations.length ? Math.max(...durations) : 0;
    return { average, max };
  });

  test.info().annotations.push({
    type: 'performance',
    description: `2048 frame durations avg=${frameMetrics.average.toFixed(2)}ms max=${frameMetrics.max.toFixed(2)}ms`,
  });

  if (frameMetrics.max > FRAME_MAX_THRESHOLD_MS) {
    console.error(`Frame duration spike detected: ${frameMetrics.max.toFixed(2)}ms`);
  }

  expect(frameMetrics.max).toBeLessThanOrEqual(FRAME_MAX_THRESHOLD_MS);

  await restartButton.click();
  await page.waitForTimeout(200);

  await closeButton.click();
  await page.waitForSelector('#2048', { state: 'detached' });

  const finalListeners = await page.evaluate(() => {
    return (window as any).__listenerTracker?.snapshot() ?? null;
  });

  if (baselineListeners && finalListeners) {
    expect(finalListeners).toEqual(baselineListeners);
  } else {
    test.info().annotations.push({ type: 'listener-tracker', description: 'Listener tracker unavailable' });
  }

  const finalHeap = await page.evaluate(() => {
    const memory = (performance as any).memory;
    return memory ? memory.usedJSHeapSize : null;
  });

  if (baselineHeap !== null && finalHeap !== null) {
    const delta = Math.abs(finalHeap - baselineHeap);
    const baselineMb = baselineHeap / (1024 * 1024);
    const finalMb = finalHeap / (1024 * 1024);
    const deltaMb = delta / (1024 * 1024);

    test.info().annotations.push({
      type: 'heap',
      description: `Heap baseline ${baselineMb.toFixed(2)} MB -> ${finalMb.toFixed(2)} MB (Δ ${deltaMb.toFixed(2)} MB)`,
    });

    if (delta > HEAP_TOLERANCE_BYTES) {
      console.error(`Heap delta ${deltaMb.toFixed(2)} MB exceeded tolerance`);
    }

    expect(delta).toBeLessThanOrEqual(HEAP_TOLERANCE_BYTES);
  } else {
    test.info().annotations.push({ type: 'heap', description: 'performance.memory not available' });
  }
});
