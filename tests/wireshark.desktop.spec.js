const { test, expect } = require('@playwright/test');
const path = require('path');

const SAMPLE_PATH = path.join(
  process.cwd(),
  'public',
  'samples',
  'wireshark',
  'http-2mb.pcap'
);
const HEAP_TOLERANCE_MB = 5;
const EXPORT_FILE = 'flow-graph.png';

async function sampleHeap(page) {
  return page.evaluate(async () => {
    const runGC = () => {
      if (typeof window.gc === 'function') {
        window.gc();
      }
    };
    runGC();
    await new Promise((resolve) => setTimeout(resolve, 0));
    runGC();
    const memory = performance?.memory?.usedJSHeapSize;
    return typeof memory === 'number' ? memory : null;
  });
}

async function measureFrameDuration(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        let first = 0;
        const handleFirst = (timestamp) => {
          first = timestamp;
          requestAnimationFrame((next) => {
            resolve(next - first);
          });
        };
        requestAnimationFrame(handleFirst);
      })
  );
}

async function collectPerformanceMetrics(page) {
  const client = await page.context().newCDPSession(page);
  const { metrics } = await client.send('Performance.getMetrics');
  const result = {};
  for (const entry of metrics) {
    result[entry.name] = entry.value;
  }
  await client.detach();
  return result;
}

test.describe('Wireshark desktop workflow', () => {
  test('loads capture, filters HTTP, exports flows, and stays responsive', async ({ page }) => {
    await page.addInitScript((exportFile) => {
      window.localStorage?.clear?.();
      window.sessionStorage?.clear?.();
      window.__wiresharkExportHref = null;
      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function (...args) {
        if (this.download === exportFile) {
          window.__wiresharkExportHref = this.href;
        }
        const fallback = originalClick || HTMLElement.prototype.click;
        return fallback.apply(this, args);
      };
    }, EXPORT_FILE);

    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const heapBefore = await sampleHeap(page);
    expect(heapBefore).not.toBeNull();

    const appsButton = page.getByRole('button', { name: 'Applications' });
    await expect(appsButton).toBeVisible();
    await appsButton.click();

    const wiresharkTile = page.getByRole('button', { name: 'Wireshark' }).first();
    await wiresharkTile.click({ clickCount: 2, delay: 75 });

    const wiresharkWindow = page.locator('#wireshark');
    await expect(wiresharkWindow).toBeVisible();

    const captureInput = wiresharkWindow.getByLabel('Capture file');
    await captureInput.setInputFiles(SAMPLE_PATH);

    const packetRows = wiresharkWindow.locator('table tbody tr');
    await expect(packetRows.first()).toBeVisible();

    const quickFilter = wiresharkWindow.getByLabel('Quick search');
    await quickFilter.fill('http');

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const rows = Array.from(
            document.querySelectorAll('#wireshark table tbody tr')
          );
          if (!rows.length) {
            return false;
          }
          return rows.every((row) => {
            const summaryCell = row.cells?.[2];
            const text = summaryCell?.textContent?.toLowerCase() || '';
            return text.includes('http');
          });
        });
      })
      .toBe(true);

    const detailPrompt = wiresharkWindow.getByText('Select a packet to view details');
    await expect(detailPrompt).toBeVisible();
    await packetRows.first().click();
    await expect(detailPrompt).toBeHidden();
    await expect(wiresharkWindow.locator('pre')).toBeVisible();

    await wiresharkWindow.getByRole('button', { name: 'Flows' }).click();
    await expect(wiresharkWindow.locator('text=/Packets:\s*\d+/')).toBeVisible();
    await expect(wiresharkWindow.locator('text=/Conversations:\s*\d+/')).toBeVisible();

    await wiresharkWindow.getByRole('button', { name: 'Export PNG' }).click();
    await expect.poll(() => page.evaluate(() => window.__wiresharkExportHref)).not.toBeNull();

    await wiresharkWindow.getByRole('button', { name: 'Window close' }).click();
    await expect(wiresharkWindow).toHaveCount(0);

    const heapAfter = await sampleHeap(page);
    expect(heapAfter).not.toBeNull();

    if (heapBefore === null || heapAfter === null) {
      throw new Error('Precise heap metrics not available');
    }
    const heapDeltaMb = Math.max(heapAfter - heapBefore, 0) / (1024 * 1024);
    expect(heapDeltaMb).toBeLessThanOrEqual(HEAP_TOLERANCE_MB);

    const frameDuration = await measureFrameDuration(page);
    expect(frameDuration).toBeLessThan(50);

    const metrics = await collectPerformanceMetrics(page);
    if (typeof metrics.TaskDuration === 'number') {
      expect(metrics.TaskDuration).toBeLessThan(5);
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
