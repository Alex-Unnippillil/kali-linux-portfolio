import { test, expect } from '@playwright/test';
import fs from 'fs/promises';

test.use({
  acceptDownloads: true,
  bypassCSP: true,
});

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface EnvDefinition {
  name: string;
  tabIndex: number;
  basePath: string;
}

interface Scenario {
  index: number;
  env: EnvDefinition;
  method: HttpMethod;
  url: string;
  body?: Record<string, unknown>;
}

interface CapturedRequest {
  method: string;
  url: string;
  payload: unknown;
}

interface CommandRecord {
  env: string;
  method: HttpMethod;
  url: string;
  command: string;
}

test.describe('HTTP client regression', () => {
  test('executes 20 request flows without regressions', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    const capturedRequests: CapturedRequest[] = [];
    await page.route('**/api/http-client-test**', async (route) => {
      const request = route.request();
      let payload: unknown = null;
      try {
        payload = request.postDataJSON();
      } catch {
        const data = request.postData();
        if (data) {
          try {
            payload = JSON.parse(data);
          } catch {
            payload = data;
          }
        }
      }
      capturedRequests.push({
        method: request.method(),
        url: request.url(),
        payload,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          method: request.method(),
          url: request.url(),
          payload,
        }),
      });
    });

    await page.route('https://va.vercel-scripts.com/**', (route) =>
      route.fulfill({ status: 204, body: '' }),
    );

    await page.addInitScript(() => {
      const win = window as typeof window & { __clsValue?: number };
      win.__clsValue = 0;
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((entries) => {
            for (const entry of entries.getEntries()) {
              const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
              if (shift.hadRecentInput) continue;
              win.__clsValue = (win.__clsValue || 0) + (shift.value || 0);
            }
          });
          observer.observe({ type: 'layout-shift', buffered: true });
        } catch (error) {
          console.warn('CLS observer failed', error);
        }
      }
    });

    await page.goto('/apps/http', { waitUntil: 'networkidle' });

    await expect(
      page.getByRole('heading', { name: 'HTTP Request Builder' }),
    ).toBeVisible({ timeout: 45000 });

    await page.evaluate(() => {
      const win = window as typeof window & { __latencySamples?: number[] };
      win.__latencySamples = [];
      const seen = new WeakSet<Element>();
      const attachProbe = (input: Element) => {
        if (!(input instanceof HTMLInputElement) || seen.has(input)) return;
        seen.add(input);
        input.addEventListener('input', () => {
          const start = performance.now();
          const form = input.closest('form');
          const preview = form?.nextElementSibling?.querySelector('pre');
          if (!preview) return;
          const observer = new MutationObserver(() => {
            win.__latencySamples?.push(performance.now() - start);
            observer.disconnect();
          });
          observer.observe(preview, {
            characterData: true,
            childList: true,
            subtree: true,
          });
        });
      };
      const scan = () => {
        document.querySelectorAll('#http-url').forEach(attachProbe);
      };
      const observer = new MutationObserver(scan);
      observer.observe(document.body, { childList: true, subtree: true });
      scan();
    });

    const environments: EnvDefinition[] = [
      { name: 'local', tabIndex: 0, basePath: '/api/http-client-test?env=local' },
      { name: 'staging', tabIndex: 1, basePath: '/api/http-client-test?env=staging' },
      { name: 'production', tabIndex: 2, basePath: '/api/http-client-test?env=production' },
    ];

    const newTabButton = page.locator('button[aria-label="New Tab"]');
    for (let i = 1; i < environments.length; i += 1) {
      await newTabButton.click();
    }
    await expect(page.locator('div[draggable="true"]')).toHaveCount(environments.length);

    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];
    const scenarios: Scenario[] = Array.from({ length: 20 }, (_, index) => {
      const env = environments[index % environments.length];
      const method = methods[index % methods.length];
      const url = `${env.basePath}&seq=${index}`;
      const body =
        method === 'GET' || method === 'DELETE'
          ? undefined
          : { seq: index, payload: `payload-${index}` };
      return { index, env, method, url, body };
    });

    const commands: CommandRecord[] = [];
    const environmentHits = Object.fromEntries(
      environments.map((env) => [env.name, 0]),
    ) as Record<string, number>;

    for (const scenario of scenarios) {
      const tab = page.locator('div[draggable="true"]').nth(scenario.env.tabIndex);
      await tab.click();
      await expect(tab).toHaveClass(/bg-gray-7/);

      environmentHits[scenario.env.name] += 1;

      const activePanel = page
        .locator('div.absolute.inset-0.w-full.h-full.block')
        .filter({ has: page.getByRole('heading', { name: 'HTTP Request Builder' }) })
        .last();
      const methodSelect = activePanel.locator('#http-method');
      const urlInput = activePanel.locator('#http-url');
      const preview = activePanel.locator('pre');

      await methodSelect.selectOption(scenario.method);
      await urlInput.fill(scenario.url);

      await page.waitForTimeout(32);

      await expect(preview).toContainText(
        `curl -X ${scenario.method} ${scenario.url}`,
      );

      const response = await page.evaluate(
        async ({ method, url, body }) => {
          const init: RequestInit = { method };
          if (body) {
            init.body = JSON.stringify(body);
            init.headers = { 'Content-Type': 'application/json' };
          }
          const res = await fetch(url, init);
          const text = await res.text();
          try {
            return JSON.parse(text);
          } catch {
            return { raw: text };
          }
        },
        { method: scenario.method, url: scenario.url, body: scenario.body },
      );

      expect(response).toMatchObject({ ok: true, method: scenario.method });
      expect(String(response.url)).toContain(`env=${scenario.env.name}`);
      expect(String(response.url)).toContain(`seq=${scenario.index}`);

      const commandText = (await preview.textContent())?.trim() ?? '';
      expect(commandText).toContain(scenario.url);
      commands.push({
        env: scenario.env.name,
        method: scenario.method,
        url: scenario.url,
        command: commandText,
      });
    }

    expect(commands).toHaveLength(20);
    expect(capturedRequests).toHaveLength(20);

    const uniqueMethods = new Set(capturedRequests.map((req) => req.method));
    expect(uniqueMethods.size).toBeGreaterThan(2);
    for (const env of environments) {
      expect(environmentHits[env.name]).toBeGreaterThan(0);
      const envRequests = capturedRequests.filter((req) =>
        req.url.includes(`env=${env.name}`),
      );
      expect(envRequests.length).toBeGreaterThan(0);
    }

    const downloadPromise = page.waitForEvent('download');
    await page.evaluate((collection) => {
      const data = JSON.stringify(collection, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'http-collection.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }, commands);
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('http-collection.json');
    const outputPath = test.info().outputPath('http-collection.json');
    await download.saveAs(outputPath);
    const exportedJson = await fs.readFile(outputPath, 'utf-8');
    const exportedCollection = JSON.parse(exportedJson) as CommandRecord[];
    expect(exportedCollection).toEqual(commands);

    const latencies = await page.evaluate(() => {
      const win = window as typeof window & { __latencySamples?: number[] };
      return win.__latencySamples ?? [];
    });
    expect(latencies.length).toBeGreaterThan(0);
    const maxLatency = Math.max(...latencies);
    expect(maxLatency).toBeLessThan(120);

    const clsValue = await page.evaluate(() => {
      const win = window as typeof window & { __clsValue?: number };
      return win.__clsValue ?? 0;
    });
    expect(clsValue).toBeLessThanOrEqual(0.02);

    const memory = await page.evaluate(() => {
      const perf = performance as Performance & {
        memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
      };
      if (!perf.memory) return null;
      const { usedJSHeapSize, jsHeapSizeLimit } = perf.memory;
      return { usedJSHeapSize, jsHeapSizeLimit };
    });

    if (memory) {
      const ratio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      test.info().annotations.push({
        type: 'memory',
        description: `heap usage ${(ratio * 100).toFixed(2)}%`,
      });
      expect(ratio).toBeLessThan(0.9);
    } else {
      test.info().annotations.push({
        type: 'memory',
        description: 'performance.memory unavailable',
      });
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

    await page.unroute('https://va.vercel-scripts.com/**');
    await page.unroute('**/api/http-client-test**');
  });
});
