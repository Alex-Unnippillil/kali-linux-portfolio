import { expect, test } from '@playwright/test';
import type { CDPSession } from 'playwright-core';

const LARGE_FILE_PATH = 'public/wallpapers/wall-7.webp';
const SEARCH_TERM = 'portfolio';

const quickOpenShortcut = process.platform === 'darwin' ? 'Meta+P' : 'Control+P';
const searchShortcut = process.platform === 'darwin' ? 'Meta+Shift+F' : 'Control+Shift+F';

async function getListenerSummary(client: CDPSession) {
  const { result } = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const entries = Object.entries(getEventListeners(window));
      return entries.map(([type, listeners]) => [type, listeners.length]);
    })()` ,
    includeCommandLineAPI: true,
    returnByValue: true,
  });
  return result.value as [string, number][];
}

function toListenerMap(entries: [string, number][]) {
  return Object.fromEntries(entries) as Record<string, number>;
}

test.describe('VS Code regression', () => {
  test('loads large file, runs search, and idles cleanly after close', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP getEventListeners is only supported in Chromium');
    await page.goto('/apps/vscode');

    const client = await context.newCDPSession(page);
    await client.send('Runtime.enable');
    const beforeEntries = await getListenerSummary(client);
    const beforeMap = toListenerMap(beforeEntries);
    const beforeTotal = Object.values(beforeMap).reduce((acc, count) => acc + count, 0);

    await expect(page.locator('iframe[title="VsCode"]')).toBeAttached({ timeout: 120_000 });
    const frame = page.frameLocator('iframe[title="VsCode"]');
    await expect(frame.locator('.monaco-workbench')).toBeVisible({ timeout: 120_000 });

    await frame.locator('.monaco-workbench').click({ position: { x: 200, y: 200 } });
    await page.keyboard.press(quickOpenShortcut);

    const quickOpenInput = frame.locator('input[aria-label*="file to open" i]');
    await expect(quickOpenInput).toBeVisible({ timeout: 20_000 });
    await quickOpenInput.fill(LARGE_FILE_PATH);
    await page.keyboard.press('Enter');

    await expect(frame.getByRole('tab', { name: /wall-7\.webp/i })).toBeVisible({ timeout: 20_000 });
    await expect(frame.getByRole('img', { name: /wall-7\.webp/i })).toBeVisible({ timeout: 20_000 });

    await page.keyboard.press(searchShortcut);
    const searchInput = frame.locator('textarea[aria-label="Search"], textarea[aria-label^="Search"], input[aria-label="Search"]');
    await expect(searchInput.first()).toBeVisible({ timeout: 10_000 });
    await searchInput.first().fill(SEARCH_TERM);
    await page.keyboard.press('Enter');
    await expect(frame.locator('[role="treeitem"]').filter({ hasText: new RegExp(SEARCH_TERM, 'i') })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('iframe[title="VsCode"]')).toHaveCount(0, { timeout: 20_000 });

    const afterEntries = await getListenerSummary(client);
    const afterMap = toListenerMap(afterEntries);
    const afterTotal = Object.values(afterMap).reduce((acc, count) => acc + count, 0);

    for (const type of new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)])) {
      expect(afterMap[type] ?? 0).toBeLessThanOrEqual(beforeMap[type] ?? 0);
    }
    expect(afterTotal).toBeLessThanOrEqual(beforeTotal);

    const idleWithinTwoSeconds = await page.evaluate(async () => {
      if (typeof requestIdleCallback !== 'function') {
        return false;
      }
      const start = performance.now();
      return new Promise<boolean>((resolve) => {
        const idleCheck = () => {
          requestIdleCallback(
            () => {
              resolve(performance.now() - start <= 2000);
            },
            { timeout: 2000 },
          );
        };
        idleCheck();
        setTimeout(() => resolve(false), 2200);
      });
    });

    expect(idleWithinTwoSeconds).toBeTruthy();
  });
});
