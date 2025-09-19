import { test, expect, Page, CDPSession, Locator } from '@playwright/test';

declare function getEventListeners(target: EventTarget): Record<string, unknown[]>;

const DRAG_ITERATIONS = 100;

async function exposeGetEventListeners(client: CDPSession) {
  await client.send('Runtime.enable');
  await client.send('Runtime.evaluate', {
    expression: 'window.getEventListeners = getEventListeners;',
    includeCommandLineAPI: true,
  });
}

async function summarizeEventListeners(page: Page) {
  return page.evaluate(() => {
    const listeners = getEventListeners(window) as Record<string, unknown[]>;
    const summary: Record<string, number> = {};
    Object.entries(listeners).forEach(([type, handlers]) => {
      summary[type] = handlers.length;
    });
    return summary;
  });
}

async function collectTraceEvents(client: CDPSession) {
  return new Promise<any[]>((resolve) => {
    client.once('Tracing.tracingComplete', async ({ stream }) => {
      if (!stream) {
        resolve([]);
        return;
      }
      let result = '';
      while (true) {
        const chunk = await client.send('IO.read', { handle: stream });
        result += chunk.data;
        if (chunk.eof) break;
      }
      await client.send('IO.close', { handle: stream });
      const events: any[] = [];
      const payloads = result.split('\n').map((line) => line.trim()).filter(Boolean);
      for (const payload of payloads) {
        try {
          const parsed = JSON.parse(payload);
          if (Array.isArray(parsed)) {
            events.push(...parsed);
          } else if (Array.isArray(parsed.traceEvents)) {
            events.push(...parsed.traceEvents);
          }
        } catch {
          // ignore malformed chunks returned by the tracing stream
        }
      }
      resolve(events);
    });
  });
}

function computeAverageFps(events: any[]) {
  const frameDurations = events
    .filter((event) => event.name === 'DrawFrame' && event.ph === 'X' && typeof event.dur === 'number')
    .map((event) => event.dur as number);

  if (!frameDurations.length) {
    throw new Error('No DrawFrame events captured from trace.');
  }

  const total = frameDurations.reduce((sum, value) => sum + value, 0);
  const averageDurationMicros = total / frameDurations.length;
  return 1_000_000 / averageDurationMicros;
}

function maxDifference(before: Record<string, number>, after: Record<string, number>) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const beforeValue = before[key] ?? 0;
    const afterValue = after[key] ?? 0;
    if (afterValue !== beforeValue) {
      return { key, before: beforeValue, after: afterValue };
    }
  }
  return null;
}

async function dragWindow(
  page: Page,
  titleLocator: Locator,
  target: { x: number; y: number },
  options: { preview?: Locator } = {},
) {
  const box = await titleLocator.boundingBox();
  if (!box) throw new Error('Unable to determine window title bounding box');
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 15 });
  if (options.preview) {
    await options.preview.waitFor({ state: 'visible' });
  }
  await page.waitForTimeout(20);
  await page.mouse.up();
}

test.describe('Window snap stress gate', () => {
  test('maintains performance and state under heavy drag interactions', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP tracing is only available in Chromium');

    await page.addInitScript(() => {
      localStorage.setItem('booting_screen', 'false');
      localStorage.setItem(
        'desktop-session',
        JSON.stringify({ windows: [], wallpaper: 'wall-2', dock: [] }),
      );
    });

    await page.goto('/');

    const windowLocator = page.locator('#about-alex');
    const titleLocator = windowLocator.locator('.bg-ub-window-title');
    await expect(windowLocator).toBeVisible();
    await expect(titleLocator).toBeVisible();

    const client = await context.newCDPSession(page);
    await exposeGetEventListeners(client);

    const listenersBefore = await summarizeEventListeners(page);

    await client.send('Tracing.start', {
      categories: 'devtools.timeline,disabled-by-default-devtools.timeline.frame',
      options: 'sampling-frequency=10000',
      transferMode: 'ReturnAsStream',
    });

    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error('Viewport size is unavailable');
    }

    const targets = [
      { x: 8, y: viewport.height / 2 },
      { x: viewport.width - 8, y: viewport.height / 2 },
      { x: viewport.width / 2, y: 12 },
    ];

    const preview = page.locator('[data-testid="snap-preview"]');

    for (let i = 0; i < DRAG_ITERATIONS; i++) {
      const target = targets[i % targets.length];
      await dragWindow(page, titleLocator, target, { preview });
      await page.waitForTimeout(50);
    }

    const relaxedTarget = { x: viewport.width * 0.35, y: viewport.height * 0.35 };
    await dragWindow(page, titleLocator, relaxedTarget);
    await page.waitForTimeout(100);

    const traceEventsPromise = collectTraceEvents(client);
    await client.send('Tracing.end');
    const traceEvents = await traceEventsPromise;
    const averageFps = computeAverageFps(traceEvents);
    expect(averageFps).toBeGreaterThan(50);

    const listenersAfter = await summarizeEventListeners(page);
    const leak = maxDifference(listenersBefore, listenersAfter);
    expect(leak).toBeNull();

    const finalPosition = await windowLocator.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    });

    await page.waitForFunction(() => {
      const stored = window.localStorage.getItem('desktop-session');
      if (!stored) return false;
      try {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed.windows)) return false;
        const win = parsed.windows.find((w: any) => w.id === 'about-alex');
        if (!win) return false;
        return typeof win.x === 'number' && typeof win.y === 'number';
      } catch (err) {
        return false;
      }
    });

    const storedSession = await page.evaluate(() => {
      const raw = window.localStorage.getItem('desktop-session');
      if (!raw) throw new Error('Session was not stored');
      const parsed = JSON.parse(raw);
      const win = parsed.windows.find((w: any) => w.id === 'about-alex');
      if (!win) throw new Error('No stored window position for about-alex');
      return { x: win.x, y: win.y };
    });

    expect(Math.abs(storedSession.x - finalPosition.x)).toBeLessThan(5);
    expect(Math.abs(storedSession.y - finalPosition.y)).toBeLessThan(5);

    await page.reload();
    await expect(windowLocator).toBeVisible();

    const reloadedPosition = await windowLocator.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    });

    expect(Math.abs(reloadedPosition.x - finalPosition.x)).toBeLessThan(5);
    expect(Math.abs(reloadedPosition.y - finalPosition.y)).toBeLessThan(5);

    const storedSessionAfter = await page.evaluate(() => {
      const raw = window.localStorage.getItem('desktop-session');
      if (!raw) throw new Error('Session missing after reload');
      const parsed = JSON.parse(raw);
      const win = parsed.windows.find((w: any) => w.id === 'about-alex');
      if (!win) throw new Error('Window session missing after reload');
      return { x: win.x, y: win.y };
    });

    expect(storedSessionAfter.x).toBeCloseTo(storedSession.x, 0);
    expect(storedSessionAfter.y).toBeCloseTo(storedSession.y, 0);

    await client.detach();
  });
});
