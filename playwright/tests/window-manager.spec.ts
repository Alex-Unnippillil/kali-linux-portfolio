import { expect, test, Page } from '@playwright/test';

const LATENCY_LIMIT_MS = 120;
const APP_IDS = ['chrome', 'terminal', 'vscode', 'x', 'spotify', 'youtube', 'settings', 'recon-ng'] as const;
const TILE_DIRECTIONS: Record<string, 'ArrowLeft' | 'ArrowRight'> = {
  chrome: 'ArrowLeft',
  terminal: 'ArrowRight',
  vscode: 'ArrowLeft',
  x: 'ArrowRight',
  spotify: 'ArrowLeft',
  youtube: 'ArrowRight',
  settings: 'ArrowLeft',
  'recon-ng': 'ArrowRight',
};

type ListenerSnapshot = {
  id: number;
  type: string;
  removed: boolean;
  alive: boolean;
  isNode: boolean;
  connected: boolean | null;
  description: string;
};

async function closeExistingWindows(page: Page) {
  const windows = page.locator('.opened-window');
  while (await windows.count()) {
    const win = windows.first();
    const id = await win.getAttribute('id');
    if (!id) {
      break;
    }
    await win.locator('button[aria-label="Window close"]').click();
    await page.locator(`#${id}`).waitFor({ state: 'detached' });
  }
}

async function openDockApp(page: Page, appId: string) {
  const dockIcon = page.locator(`#sidebar-${appId}`);
  await dockIcon.waitFor({ state: 'visible' });
  await dockIcon.click();
  await page.locator(`#${appId}`).waitFor({ state: 'visible' });
}

async function openReconFromAppGrid(page: Page) {
  const showApps = page.locator('nav[aria-label="Dock"] img[alt="Ubuntu view app"]');
  await showApps.click();
  const reconTile = page.locator('#app-recon-ng');
  await reconTile.waitFor({ state: 'visible' });
  await reconTile.dblclick();
  await page.locator('#recon-ng').waitFor({ state: 'visible' });
  const overlay = page.locator('.all-apps-anim');
  await overlay.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
}

async function measureTile(page: Page, windowId: string, direction: 'ArrowLeft' | 'ArrowRight') {
  const latency = await page.evaluate(
    ({ id, dir }) =>
      new Promise<number>((resolve, reject) => {
        const node = document.getElementById(id);
        if (!node) {
          reject(new Error(`Window ${id} not found`));
          return;
        }
        const start = performance.now();
        const deadline = start + 5000;
        const check = () => {
          const current = document.getElementById(id);
          if (!current) {
            reject(new Error(`Window ${id} removed before tiling`));
            return;
          }
          const transform = current.style.transform || '';
          let done = false;
          if (dir === 'ArrowLeft') {
            done = transform.includes('translate(-1pt') && transform.includes('-2pt');
          } else {
            const match = /translate\(([-\d.]+)px/.exec(transform);
            if (match) {
              const x = parseFloat(match[1]);
              done = Math.abs(x - window.innerWidth / 2) <= 2 && transform.includes('-2pt');
            }
          }
          if (done) {
            resolve(performance.now() - start);
            return;
          }
          if (performance.now() > deadline) {
            reject(new Error(`Timed out waiting for ${dir} snap on ${id}`));
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
        node.dispatchEvent(new CustomEvent('super-arrow', { detail: dir }));
      }),
    { id: windowId, dir: direction },
  );
  expect(latency).toBeLessThanOrEqual(LATENCY_LIMIT_MS);
  return latency;
}

async function measureMinimize(page: Page, windowId: string) {
  const waitForMinimize = page.evaluate(
    ({ id }) =>
      new Promise<number>((resolve, reject) => {
        const start = performance.now();
        const deadline = start + 5000;
        const check = () => {
          const current = document.getElementById(id);
          if (!current) {
            reject(new Error(`Window ${id} missing during minimize`));
            return;
          }
          if (current.classList.contains('opacity-0')) {
            resolve(performance.now() - start);
            return;
          }
          if (performance.now() > deadline) {
            reject(new Error(`Timed out waiting for minimize on ${id}`));
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
    { id: windowId },
  );
  await page.locator(`#${windowId} button[aria-label="Window minimize"]`).click();
  const latency = await waitForMinimize;
  expect(latency).toBeLessThanOrEqual(LATENCY_LIMIT_MS);
  return latency;
}

async function measureRestore(page: Page, windowId: string) {
  const waitForRestore = page.evaluate(
    ({ id }) =>
      new Promise<number>((resolve, reject) => {
        const start = performance.now();
        const deadline = start + 5000;
        const check = () => {
          const current = document.getElementById(id);
          if (!current) {
            reject(new Error(`Window ${id} missing during restore`));
            return;
          }
          const hidden = current.classList.contains('opacity-0');
          const closed = current.classList.contains('closed-window');
          if (!hidden && !closed) {
            resolve(performance.now() - start);
            return;
          }
          if (performance.now() > deadline) {
            reject(new Error(`Timed out waiting for restore on ${id}`));
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
    { id: windowId },
  );
  await page.locator(`#sidebar-${windowId}`).click();
  const latency = await waitForRestore;
  expect(latency).toBeLessThanOrEqual(LATENCY_LIMIT_MS);
  return latency;
}

async function measureClose(page: Page, windowId: string) {
  const waitForCloseState = page.evaluate(
    ({ id }) =>
      new Promise<number>((resolve, reject) => {
        const start = performance.now();
        const deadline = start + 5000;
        const check = () => {
          const current = document.getElementById(id);
          if (!current) {
            resolve(performance.now() - start);
            return;
          }
          if (current.classList.contains('closed-window')) {
            resolve(performance.now() - start);
            return;
          }
          if (performance.now() > deadline) {
            reject(new Error(`Timed out waiting for close on ${id}`));
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
    { id: windowId },
  );
  await page.locator(`#${windowId} button[aria-label="Window close"]`).click();
  const latency = await waitForCloseState;
  expect(latency).toBeLessThanOrEqual(LATENCY_LIMIT_MS);
  await page.locator(`#${windowId}`).waitFor({ state: 'detached' });
  return latency;
}

async function measureWorkspaceSwitch(page: Page) {
  const waitForWorkspace = page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const start = performance.now();
        const deadline = start + 5000;
        const findButton = () =>
          Array.from(document.querySelectorAll('#recon-ng button')).find(
            (btn) => btn.textContent?.trim() === 'Workspace 2',
          ) as HTMLButtonElement | undefined;
        const check = () => {
          const button = findButton();
          if (!button) {
            reject(new Error('Workspace 2 button missing'));
            return;
          }
          if (button.classList.contains('bg-blue-600')) {
            resolve(performance.now() - start);
            return;
          }
          if (performance.now() > deadline) {
            reject(new Error('Timed out waiting for workspace activation'));
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
    undefined,
  );
  const reconWindow = page.locator('#recon-ng');
  await reconWindow.locator('button:has-text("+")').first().click();
  await reconWindow.locator('button', { hasText: 'Workspace 2' }).click();
  const latency = await waitForWorkspace;
  expect(latency).toBeLessThanOrEqual(LATENCY_LIMIT_MS);
  return latency;
}

async function readHeapUsage(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');
  const metrics = await client.send('Performance.getMetrics');
  await client.send('Performance.disable');
  const heapMetric = metrics.metrics.find((item: { name: string; value: number }) => item.name === 'JSHeapUsedSize');
  await client.detach();
  return heapMetric ? heapMetric.value : 0;
}

test.describe('Window manager performance envelope', () => {
  test('tiles, switches workspaces, minimizes, restores, and closes within latency budget', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('booting_screen', 'false');
        window.localStorage.setItem('screen-locked', 'false');
        window.localStorage.setItem('shut-down', 'false');
        window.localStorage.setItem('new_folders', '[]');
        window.localStorage.setItem('recentApps', '[]');
        window.localStorage.setItem('frequentApps', '[]');
        window.localStorage.setItem('window-trash', '[]');
      } catch (error) {
        console.warn('Failed to prime localStorage', error);
      }
      const originalMatchMedia = window.matchMedia ? window.matchMedia.bind(window) : undefined;
      window.matchMedia = (query: string) => {
        if (query.includes('prefers-reduced-motion')) {
          const mql = {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as MediaQueryList;
          return mql;
        }
        if (originalMatchMedia) {
          return originalMatchMedia(query);
        }
        const fallback = {
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        } as MediaQueryList;
        return fallback;
      };
      const records: Array<{
        id: number;
        type: string;
        listener: EventListenerOrEventListenerObject;
        options: boolean | AddEventListenerOptions | undefined;
        removed: boolean;
        targetRef?: WeakRef<EventTarget>;
        target?: EventTarget;
      }> = [];
      let listenerId = 0;
      const supportsWeakRef = typeof WeakRef === 'function';
      const originalAdd = EventTarget.prototype.addEventListener;
      const originalRemove = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener = function patchedAdd(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (listener) {
          const record: {
            id: number;
            type: string;
            listener: EventListenerOrEventListenerObject;
            options: boolean | AddEventListenerOptions | undefined;
            removed: boolean;
            targetRef?: WeakRef<EventTarget>;
            target?: EventTarget;
          } = {
            id: ++listenerId,
            type,
            listener,
            options,
            removed: false,
          };
          if (supportsWeakRef) {
            record.targetRef = new WeakRef(this);
          } else {
            record.target = this;
          }
          records.push(record);
        }
        return originalAdd.call(this, type, listener, options);
      };
      EventTarget.prototype.removeEventListener = function patchedRemove(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
      ) {
        const result = originalRemove.call(this, type, listener, options);
        for (const record of records) {
          if (record.removed || record.listener !== listener || record.type !== type) {
            continue;
          }
          const current = record.targetRef ? record.targetRef.deref() : record.target;
          if (current === this) {
            record.removed = true;
          }
        }
        return result;
      };
      (window as unknown as { getEventListeners?: (target: EventTarget) => Record<string, unknown[]> }).getEventListeners = (
        target: EventTarget,
      ) => {
        const summary: Record<string, unknown[]> = {};
        for (const record of records) {
          if (record.removed) continue;
          const current = record.targetRef ? record.targetRef.deref() : record.target;
          if (current === target) {
            if (!summary[record.type]) summary[record.type] = [];
            summary[record.type]!.push({ listener: record.listener, options: record.options });
          }
        }
        return summary;
      };
      (window as unknown as { __describeListenerRecords?: () => Array<Record<string, unknown>> }).__describeListenerRecords = () =>
        records.map((record) => {
          const current = record.targetRef ? record.targetRef.deref() : record.target;
          const alive = !!current;
          const isNode = alive && current instanceof Node;
          const description = (() => {
            if (!alive) return 'collected';
            if (current === window) return 'window';
            if (isNode) {
              const element = current as Element;
              const id = element.id ? `#${element.id}` : '';
              return `${element.nodeName.toLowerCase()}${id}`;
            }
            return typeof current;
          })();
          return {
            id: record.id,
            type: record.type,
            removed: record.removed,
            alive,
            isNode,
            connected: isNode ? (current as Node).isConnected : null,
            description,
          };
        });
    });

    await page.goto('/');
    await page.waitForSelector('#desktop');
    await closeExistingWindows(page);

    for (const appId of APP_IDS) {
      if (appId === 'recon-ng') {
        await openReconFromAppGrid(page);
      } else {
        await openDockApp(page, appId);
      }
    }

    const tileLatencies: number[] = [];
    for (const appId of APP_IDS) {
      await page.locator(`#${appId} .bg-ub-window-title`).first().click();
      const dir = TILE_DIRECTIONS[appId];
      const latency = await measureTile(page, appId, dir);
      tileLatencies.push(latency);
    }

    const workspaceLatency = await measureWorkspaceSwitch(page);

    const minimizeLatencies: number[] = [];
    for (const appId of APP_IDS) {
      const latency = await measureMinimize(page, appId);
      minimizeLatencies.push(latency);
    }

    const restoreLatencies: number[] = [];
    for (const appId of APP_IDS) {
      const latency = await measureRestore(page, appId);
      restoreLatencies.push(latency);
    }

    const heapBeforeClose = await readHeapUsage(page);

    const closeLatencies: number[] = [];
    for (const appId of APP_IDS) {
      const latency = await measureClose(page, appId);
      closeLatencies.push(latency);
    }

    const heapAfterClose = await readHeapUsage(page);
    expect(heapAfterClose).toBeLessThanOrEqual(heapBeforeClose * 1.05);

    const listenerSummary = await page.evaluate<ListenerSnapshot[] | null>(() => {
      const reporter = (window as unknown as { __describeListenerRecords?: () => ListenerSnapshot[] })
        .__describeListenerRecords;
      return typeof reporter === 'function' ? reporter() : null;
    });
    expect(listenerSummary).not.toBeNull();
    const snapshots = listenerSummary ?? [];
    const orphaned = snapshots.filter((entry) => !entry.removed && entry.alive && entry.isNode && entry.connected === false);
    expect(orphaned).toHaveLength(0);

    const windowListeners = await page.evaluate<string[]>(() =>
      Object.keys((window as unknown as { getEventListeners: (target: EventTarget) => Record<string, unknown[]> }).getEventListeners(window)),
    );
    expect(windowListeners.length).toBeGreaterThan(0);

    const allLatencies = [
      ...tileLatencies,
      workspaceLatency,
      ...minimizeLatencies,
      ...restoreLatencies,
      ...closeLatencies,
    ];
    for (const latency of allLatencies) {
      expect(latency).toBeLessThanOrEqual(LATENCY_LIMIT_MS);
    }
  });
});
