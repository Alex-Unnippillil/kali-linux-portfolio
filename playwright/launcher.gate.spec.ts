import { expect, test, type CDPSession, type Page, type TestInfo } from '@playwright/test';
import { percySnapshot } from '@percy/playwright';
import { gzipSync } from 'node:zlib';

const SEARCH_QUERIES = [
  'Terminal',
  'Calculator',
  'Converter',
  'Tic Tac Toe',
  'Chess',
  'Connect Four',
  'Hangman',
  'Frogger',
  'Flappy Bird',
  '2048',
  'Snake',
  'Memory',
  'Minesweeper',
  'Pong',
  'Pacman',
  'Car Racer',
  'Lane Runner',
  'Platformer',
  'Battleship',
  'Checkers',
  'Reversi',
  'Simon',
  'Sokoban',
  'Solitaire',
  'Tower Defense',
  'Word Search',
  'Wordle',
  'Blackjack',
  'Breakout',
  'Asteroids',
] as const;

const COMMAND_TARGETS = [
  { id: 'terminal', title: 'Terminal' },
  { id: 'calculator', title: 'Calculator' },
  { id: 'weather', title: 'Weather' },
  { id: 'wireshark', title: 'Wireshark' },
  { id: 'hashcat', title: 'Hashcat' },
  { id: 'hydra', title: 'Hydra' },
  { id: 'radare2', title: 'Radare2' },
  { id: 'metasploit', title: 'Metasploit' },
  { id: 'openvas', title: 'OpenVAS' },
  { id: 'project-gallery', title: 'Project Gallery' },
] as const;

const PIN_TARGETS = [
  { id: 'chrome', title: 'Chrome' },
  { id: 'spotify', title: 'Spotify' },
  { id: 'youtube', title: 'YouTube' },
] as const;

type MemoryMetrics = {
  jsHeapUsed: number;
  jsHeapTotal: number;
  documents: number;
  nodes: number;
  jsEventListeners: number;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeForSelector(value: string): string {
  return value.replace(/([!"#$%&'()*+,./:;<=>?@[\\\\]^`{|}~])/g, '\\$1');
}

async function ensureDesktopReady(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#desktop', { state: 'visible' });
}

async function ensureLauncherOpen(page: Page) {
  const overlay = page.locator('.all-apps-anim');
  if (!(await overlay.isVisible())) {
    const launcherButton = page.locator('nav[aria-label="Dock"] img[alt="Ubuntu view app"]').first();
    await launcherButton.click();
    await overlay.waitFor({ state: 'visible' });
  }
  const searchInput = overlay.locator('input[placeholder="Search"]');
  await expect(searchInput).toBeVisible();
  const results = overlay.locator('[data-context="app"]');
  return { overlay, searchInput, results };
}

async function captureMemoryMetrics(session: CDPSession): Promise<MemoryMetrics> {
  const { metrics } = await session.send('Performance.getMetrics');
  const jsHeapUsed = metrics.find((entry) => entry.name === 'JSHeapUsedSize')?.value ?? 0;
  const jsHeapTotal = metrics.find((entry) => entry.name === 'JSHeapTotalSize')?.value ?? 0;
  const domCounters = await session.send('Memory.getDOMCounters');
  return {
    jsHeapUsed,
    jsHeapTotal,
    documents: domCounters.documents,
    nodes: domCounters.nodes,
    jsEventListeners: domCounters.jsEventListeners,
  };
}

async function takeHeapSnapshot(session: CDPSession): Promise<Buffer> {
  const chunks: string[] = [];
  const handleChunk = (params: { chunk: string }) => {
    chunks.push(params.chunk);
  };
  session.on('HeapProfiler.addHeapSnapshotChunk', handleChunk);
  try {
    await session.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  } finally {
    if (typeof session.off === 'function') {
      session.off('HeapProfiler.addHeapSnapshotChunk', handleChunk);
    } else {
      // @ts-expect-error - removeListener exists at runtime
      session.removeListener('HeapProfiler.addHeapSnapshotChunk', handleChunk);
    }
  }
  const snapshot = chunks.join('');
  return gzipSync(snapshot);
}

async function attachJson(testInfo: TestInfo, name: string, payload: unknown) {
  const body = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
  await testInfo.attach(name, { body, contentType: 'application/json' });
}

async function runVisualSnapshot(page: Page, testInfo: TestInfo, name: string) {
  if (process.env.PERCY_SERVER_ADDRESS || process.env.PERCY_TOKEN) {
    try {
      await percySnapshot(page, name);
      testInfo.annotations.push({ type: 'info', description: `Percy snapshot captured: ${name}` });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      testInfo.annotations.push({ type: 'warning', description: `Percy snapshot failed: ${message}` });
    }
  }

  if (process.env.CHROMATIC_PROJECT_TOKEN) {
    try {
      const chromatic = await import('@chromatic-com/playwright');
      if (chromatic && typeof chromatic.chromaticSnapshot === 'function') {
        await chromatic.chromaticSnapshot(page, { name });
        testInfo.annotations.push({ type: 'info', description: `Chromatic snapshot captured: ${name}` });
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      testInfo.annotations.push({ type: 'warning', description: `Chromatic snapshot failed: ${message}` });
    }
  }

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach(`${name}.png`, {
    body: screenshot,
    contentType: 'image/png',
  });
}

test.describe('Launcher gate workflow', () => {
  test('handles heavy search, command, and pin flows without memory leaks', async ({ page }, testInfo) => {
    await ensureDesktopReady(page);

    const session = await page.context().newCDPSession(page);
    await session.send('Performance.enable');
    await session.send('HeapProfiler.enable');
    await session.send('HeapProfiler.startTrackingHeapObjects', { trackAllocations: true });

    try {
      const baselineMemory = await captureMemoryMetrics(session);
      await attachJson(testInfo, 'memory-baseline.json', baselineMemory);
      const baselineSnapshot = await takeHeapSnapshot(session);
      await testInfo.attach('heap-before.heapsnapshot.gz', {
        body: baselineSnapshot,
        contentType: 'application/gzip',
      });

      await runVisualSnapshot(page, testInfo, 'Launcher gate - desktop baseline');

      await test.step('execute 30 launcher searches', async () => {
        const { searchInput, results } = await ensureLauncherOpen(page);
        expect(SEARCH_QUERIES).toHaveLength(30);
        for (const query of SEARCH_QUERIES) {
          await searchInput.fill(query);
          await expect(searchInput).toHaveValue(query);
          const regex = new RegExp(escapeRegExp(query), 'i');
          await expect(results.filter({ hasText: regex })).not.toHaveCount(0);
        }
      });

      const afterSearchMemory = await captureMemoryMetrics(session);
      await attachJson(testInfo, 'memory-after-searches.json', afterSearchMemory);

      await test.step('pin key apps from search results', async () => {
        for (const target of PIN_TARGETS) {
          const { searchInput: pinSearch, results: pinResults } = await ensureLauncherOpen(page);
          const dockItem = page.locator(`nav[aria-label="Dock"] [data-app-id="${target.id}"]`);
          await pinSearch.fill(target.title);
          const candidate = pinResults.locator(`[data-app-id="${target.id}"]`).first();
          await expect(candidate).toBeVisible();

          if (await dockItem.isVisible()) {
            await candidate.click({ button: 'right' });
            const unpinButton = page.getByRole('menuitem', { name: 'Unpin from Favorites' });
            if (await unpinButton.isVisible()) {
              await unpinButton.click();
              await expect(page.locator('#app-menu')).toBeHidden();
              await expect(dockItem).toBeHidden();
            }
            await candidate.click({ button: 'right' });
          } else {
            await candidate.click({ button: 'right' });
          }

          await expect(page.locator('#app-menu')).toBeVisible();
          const pinButton = page.getByRole('menuitem', { name: 'Pin to Favorites' });
          await pinButton.click();
          await expect(page.locator('#app-menu')).toBeHidden();
          await expect(dockItem).toBeVisible();
        }
      });

      const afterPinMemory = await captureMemoryMetrics(session);
      await attachJson(testInfo, 'memory-after-pins.json', afterPinMemory);

      await test.step('execute 10 application launch commands', async () => {
        for (const target of COMMAND_TARGETS) {
          const { searchInput: commandSearch, results: commandResults } = await ensureLauncherOpen(page);
          await commandSearch.fill(target.title);
          const appTile = commandResults.locator(`[data-app-id="${target.id}"]`).first();
          await expect(appTile).toBeVisible();
          await appTile.dblclick();

          const windowSelector = `#${escapeForSelector(target.id)}`;
          const appWindow = page.locator(windowSelector);
          await expect(appWindow).toBeVisible();

          const closeButton = page.locator(`#close-${escapeForSelector(target.id)}`);
          await expect(closeButton).toBeVisible();
          await closeButton.click();
          await appWindow.waitFor({ state: 'detached' });
        }
      });

      const finalMemory = await captureMemoryMetrics(session);
      await attachJson(testInfo, 'memory-after-commands.json', finalMemory);

      const finalSnapshot = await takeHeapSnapshot(session);
      await testInfo.attach('heap-after.heapsnapshot.gz', {
        body: finalSnapshot,
        contentType: 'application/gzip',
      });

      await runVisualSnapshot(page, testInfo, 'Launcher gate - post interactions');

      const allowedHeapGrowth = 60 * 1024 * 1024; // 60 MB
      const heapGrowth = Math.max(finalMemory.jsHeapUsed - baselineMemory.jsHeapUsed, 0);
      expect(heapGrowth).toBeLessThan(allowedHeapGrowth);

      const nodeGrowth = Math.max(finalMemory.nodes - baselineMemory.nodes, 0);
      expect(nodeGrowth).toBeLessThan(6000);

      const listenerGrowth = Math.max(finalMemory.jsEventListeners - baselineMemory.jsEventListeners, 0);
      expect(listenerGrowth).toBeLessThan(200);
    } finally {
      await session.send('HeapProfiler.stopTrackingHeapObjects').catch(() => {});
      await session.send('HeapProfiler.disable').catch(() => {});
      await session.send('Performance.disable').catch(() => {});
    }
  });
});
