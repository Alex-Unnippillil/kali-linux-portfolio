import { test, expect, Page } from '@playwright/test';

const CLIPBOARD_ENTRY_COUNT = 500;
const CLIPBOARD_PAYLOAD_SIZE = 1024;
const SEED_GROWTH_EXPECTATION = 300_000;
const HEAP_CHECK_INTERVAL = 200;

async function readHeapUsage(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number };
    };
    return perf.memory?.usedJSHeapSize ?? null;
  });
}

async function waitForHeapBelow(
  page: Page,
  threshold: number,
  timeout = 10_000,
): Promise<number | null> {
  const started = Date.now();
  let last = await readHeapUsage(page);
  while (Date.now() - started < timeout) {
    await page.waitForTimeout(HEAP_CHECK_INTERVAL);
    const current = await readHeapUsage(page);
    if (current !== null) {
      last = current;
      if (current <= threshold) {
        return current;
      }
    }
  }
  return last;
}

test('Clipboard Manager clears history and recovers heap usage', async ({ page, context, baseURL }) => {
  test.setTimeout(120_000);
  const origin = baseURL ?? 'http://localhost:3000';
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });

  await page.addInitScript(() => {
    const store: { value: string } = { value: '' };
    const clipboard = {
      writeText(text: string) {
        store.value = text;
        return Promise.resolve();
      },
      readText() {
        return Promise.resolve(store.value);
      },
    };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get() {
        return clipboard;
      },
    });
    const nav = navigator as Navigator & { permissions?: any };
    const allow = new Set(['clipboard-read', 'clipboard-write']);
    const originalQuery = nav.permissions?.query?.bind(nav.permissions);
    if (nav.permissions) {
      nav.permissions.query = (descriptor: any) => {
        const name = descriptor?.name;
        if (name && allow.has(name)) {
          return Promise.resolve({ state: 'granted', onchange: null });
        }
        return originalQuery
          ? originalQuery(descriptor)
          : Promise.resolve({ state: 'prompt', onchange: null });
      };
    } else {
      (nav as any).permissions = {
        query: () => Promise.resolve({ state: 'granted', onchange: null }),
      };
    }
  });

  await page.goto('/');
  await page.waitForFunction(() => document.getElementById('desktop') !== null);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: 'clipboard-manager' }));
  });

  const windowRoot = page.locator('#clipboard-manager');
  await expect(windowRoot).toBeVisible({ timeout: 30_000 });
  const listItems = windowRoot.getByRole('listitem');

  const baselineHeap = await readHeapUsage(page);
  expect(baselineHeap, 'performance.memory should be available in Chromium').not.toBeNull();
  console.log(`[heap] baseline=${baselineHeap ?? -1}`);

  await page.evaluate(
    async ({ total, payloadSize }) => {
      const payload = 'X'.repeat(payloadSize);
      for (let i = 0; i < total; i++) {
        const text = `Clipboard entry ${i} ${payload}`;
        await navigator.clipboard.writeText(text);
        document.dispatchEvent(new Event('copy', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    },
    { total: CLIPBOARD_ENTRY_COUNT, payloadSize: CLIPBOARD_PAYLOAD_SIZE },
  );

  await expect(listItems).toHaveCount(CLIPBOARD_ENTRY_COUNT, { timeout: 30_000 });

  await page.waitForTimeout(1000);
  const afterSeedHeap = await readHeapUsage(page);
  expect(afterSeedHeap).not.toBeNull();
  const baselineValue = baselineHeap ?? 0;
  const seededValue = afterSeedHeap ?? baselineValue;
  const growth = seededValue - baselineValue;
  console.log(`[heap] growth baseline=${baselineValue} seeded=${seededValue} delta=${growth}`);
  expect(growth).toBeGreaterThanOrEqual(SEED_GROWTH_EXPECTATION);

  await windowRoot.getByRole('button', { name: 'Clear History' }).click();
  await expect(listItems).toHaveCount(0, { timeout: 15_000 });

  const tolerance = Math.max(200_000, (seededValue - baselineValue) * 0.1);
  const target = baselineValue + tolerance;
  const recoveredHeap = await waitForHeapBelow(page, target, 20_000);

  test.info().annotations.push({
    type: 'heap-usage',
    description: `baseline=${baselineValue} seeded=${seededValue} cleared=${recoveredHeap ?? -1} target<=${target}`,
  });
  console.log(
    `[heap] baseline=${baselineValue} seeded=${seededValue} cleared=${recoveredHeap} target<=${target}`,
  );

  expect(recoveredHeap).not.toBeNull();
  expect((recoveredHeap ?? Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(target);
});
