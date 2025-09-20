import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CPU_THROTTLE_RATE = 2;
const SCRIPT_LINE_TARGET = 1200;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const logPath = path.resolve(repoRoot, 'test-log.md');

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, power);
  return `${value.toFixed(2)} ${units[power]}`;
}

test.describe('terminal regression', () => {
  test('measures terminal responsiveness and cleanup', async ({ page, browserName }, testInfo) => {
    test.slow();
    test.skip(browserName !== 'chromium', 'Terminal metrics rely on Chromium-only APIs');

    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.clearBrowserCache');
    await client.send('Network.clearBrowserCookies');
    await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE_RATE });

    const metrics = {
      cpuThrottleRate: CPU_THROTTLE_RATE,
      navigationTtiMs: 0,
      helpCommandMs: 0,
      baselineHeapBytes: 0,
      postCloseHeapBytes: 0,
      heapDeltaRatio: 0,
      emittedLines: SCRIPT_LINE_TARGET,
    };

    try {
      await page.goto('/apps/terminal', { waitUntil: 'networkidle' });
      const terminal = page.locator('[data-testid="xterm-container"]');
      await expect(terminal).toBeVisible();

      await page.waitForFunction(() => {
        const rows = document.querySelector('[data-testid="xterm-container"] .xterm-rows');
        if (!rows) return false;
        const text = rows.textContent || '';
        return text.includes('Welcome to the web terminal!') && text.includes('└─$ ');
      });

      const navigationTti = await page.evaluate(() => {
        const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const start = entry?.startTime ?? 0;
        return performance.now() - start;
      });
      metrics.navigationTtiMs = navigationTti;
      expect(navigationTti).toBeLessThanOrEqual(1000);

      const baselineMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
      metrics.baselineHeapBytes = baselineMemory;
      expect(baselineMemory).toBeGreaterThan(0);

      await terminal.click();

      const helpStart = await page.evaluate(() => performance.now());
      await page.keyboard.type('help', { delay: 1 });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => {
        const rows = document.querySelector('[data-testid="xterm-container"] .xterm-rows');
        const text = rows?.textContent || '';
        return text.includes('Available commands:') && text.includes('Example scripts:');
      });
      const helpDuration = await page.evaluate((start) => performance.now() - start, helpStart);
      metrics.helpCommandMs = helpDuration;

      for (let i = 0; i < SCRIPT_LINE_TARGET; i += 1) {
        const lineLabel = `playwright-line-${i}`;
        await page.keyboard.insertText(`echo ${lineLabel}`);
        await page.keyboard.press('Enter');
        await page.waitForFunction(
          (expected) => {
            const rows = document.querySelector('[data-testid="xterm-container"] .xterm-rows');
            return rows?.textContent?.includes(expected) ?? false;
          },
          lineLabel,
        );
      }

      const closeButton = page.locator('button[aria-label="Window close"]');
      await expect(closeButton).toBeVisible();
      await closeButton.click();
      await expect(terminal).toHaveCount(0);

      await page.waitForTimeout(500);

      const postCloseMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
      metrics.postCloseHeapBytes = postCloseMemory;
      expect(postCloseMemory).toBeGreaterThan(0);

      if (baselineMemory > 0) {
        const delta = Math.abs(postCloseMemory - baselineMemory) / baselineMemory;
        metrics.heapDeltaRatio = delta;
        expect(delta).toBeLessThanOrEqual(0.05);
      }

      const timestamp = new Date().toISOString();
      const logEntry = `\n## Terminal regression run — ${timestamp}\n\n` +
        `- CPU throttle: ${CPU_THROTTLE_RATE}×\n` +
        `- Navigation TTI: ${metrics.navigationTtiMs.toFixed(2)} ms\n` +
        `- Help command latency: ${metrics.helpCommandMs.toFixed(2)} ms\n` +
        `- Baseline heap: ${formatBytes(metrics.baselineHeapBytes)}\n` +
        `- Post-close heap: ${formatBytes(metrics.postCloseHeapBytes)}\n` +
        `- Heap delta: ${(metrics.heapDeltaRatio * 100).toFixed(2)}%\n` +
        `- Script lines emitted: ${SCRIPT_LINE_TARGET}\n`;

      await fs.appendFile(logPath, logEntry, 'utf8');
      await testInfo.attach('terminal-regression-metrics', {
        body: JSON.stringify({ ...metrics, timestamp }, null, 2),
        contentType: 'application/json',
      });
    } finally {
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
  });
});
