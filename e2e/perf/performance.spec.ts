import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync, promises as fs } from 'node:fs';
import path from 'node:path';

const budgetsPath = path.join(__dirname, 'budgets.json');
const budgetsData = JSON.parse(readFileSync(budgetsPath, 'utf-8')) as PerfBudgetsFile;

const metricNames: MetricName[] = ['lcp', 'inp', 'cls', 'memory'];

test.use({
  headless: true,
  viewport: { width: 1366, height: 768 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
  timezoneId: 'UTC',
  locale: 'en-US',
  trace: 'retain-on-failure',
});

test.describe('performance budgets', () => {
  test.describe.configure({ mode: 'serial' });

  const scenarios: ScenarioDefinition[] = [
    {
      id: 'desktop-load',
      url: '/',
      description: 'Initial Kali-style desktop boot with pinned applications rendered.',
      run: async (page) => {
        await page.waitForSelector('[data-app-id="firefox"]', { state: 'visible' });
        await page.waitForTimeout(1000);
      },
    },
    {
      id: 'apps-catalog-heavy',
      url: '/apps',
      description: 'Search catalogue and open a complex security simulation window.',
      run: async (page) => {
        const search = page.locator('#app-search');
        await search.waitFor({ state: 'visible' });
        await search.fill('metasploit');
        await page.waitForTimeout(100);
        const targetLink = page.getByRole('link', { name: /Metasploit/i });
        await targetLink.first().click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      },
    },
  ];

  for (const scenario of scenarios) {
    const budget = budgetsData.scenarios[scenario.id];
    if (!budget) {
      throw new Error(`Missing performance budget for scenario: ${scenario.id}`);
    }

    test(`${scenario.id} respects performance budgets`, async ({ context, page }, testInfo) => {
      await preparePage(page);
      await context.tracing.start({
        title: scenario.id,
        screenshots: true,
        snapshots: true,
        sources: true,
      });

      const metricsPath = testInfo.outputPath(`${scenario.id}-metrics.json`);
      const tracePath = testInfo.outputPath(`${scenario.id}-trace.zip`);

      try {
        await page.goto(scenario.url, { waitUntil: 'networkidle' });
        await scenario.run(page);
        await page.waitForTimeout(500);

        const metrics = await collectMetrics(page);
        const record: ScenarioRunRecord = {
          scenario: scenario.id,
          description: scenario.description,
          metrics,
        };

        await fs.writeFile(metricsPath, JSON.stringify(record, null, 2), 'utf-8');
        await testInfo.attach('metrics', {
          path: metricsPath,
          contentType: 'application/json',
        });

        const captureDir = process.env.PERF_CAPTURE_PATH;
        if (captureDir) {
          await fs.mkdir(captureDir, { recursive: true });
          await fs.writeFile(path.join(captureDir, `${scenario.id}.json`), JSON.stringify(record, null, 2), 'utf-8');
        }

        for (const name of metricNames) {
          const bounds = budget.metrics[name];
          if (!bounds) continue;
          const limit = bounds.baseline + bounds.maxRegression;
          const actual = metrics[name];
          const formattedLimit =
            name === 'memory'
              ? `${Math.round(limit / 1024 / 1024)} MB`
              : name === 'cls'
                ? limit.toFixed(3)
                : `${Math.round(limit)} ms`;
          expect(actual, `${scenario.id} ${name} should remain under ${formattedLimit}`).toBeLessThanOrEqual(limit);
        }
      } finally {
        await context.tracing.stop({ path: tracePath });
      }
    });
  }
});

async function preparePage(page: Page) {
  await page.context().clearCookies();
  await page.context().clearPermissions();

  await page.addInitScript(() => {
    try {
      window.localStorage?.clear();
      window.sessionStorage?.clear();
    } catch (error) {
      console.warn('Failed to clear storage before performance test', error);
    }
  });

  await page.addInitScript(() => {
    const metricsState: PerfMetricsOnWindow = {
      lcp: 0,
      cls: 0,
      inp: 0,
    };
    (window as unknown as PerfWindow).__performanceMetrics = metricsState;

    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as LargestContentfulPaintEntry[]) {
          const value = entry.renderTime || entry.loadTime || entry.startTime;
          if (value > metricsState.lcp) {
            metricsState.lcp = value;
          }
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (error) {
      console.warn('Failed to observe LCP', error);
    }

    try {
      let cumulativeLayoutShift = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as LayoutShiftEntry[]) {
          if (!entry.hadRecentInput) {
            cumulativeLayoutShift += entry.value;
          }
        }
        metricsState.cls = cumulativeLayoutShift;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
      console.warn('Failed to observe CLS', error);
    }

    try {
      let worstInteraction = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as PerformanceEventTiming[]) {
          if (!entry.interactionId) continue;
          if (entry.duration > worstInteraction) {
            worstInteraction = entry.duration;
          }
        }
        metricsState.inp = worstInteraction;
      }).observe({ type: 'event', durationThreshold: 0, buffered: true });
    } catch (error) {
      console.warn('Failed to observe INP', error);
    }
  });
}

async function collectMetrics(page: Page): Promise<PerfMetrics> {
  const raw = await page.evaluate(() => {
    const perf = window.performance;
    const navEntry = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const fallbackLcp = navEntry ? Math.max(navEntry.domComplete || 0, navEntry.loadEventEnd || 0) : 0;
    const metrics = (window as unknown as PerfWindow).__performanceMetrics ?? { lcp: fallbackLcp, cls: 0, inp: 0 };
    const memoryStats = (perf as unknown as { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number } }).memory;
    const heapSize = memoryStats?.usedJSHeapSize ?? memoryStats?.totalJSHeapSize ?? 0;

    return {
      lcp: metrics.lcp > 0 ? metrics.lcp : fallbackLcp,
      cls: metrics.cls ?? 0,
      inp: metrics.inp ?? 0,
      memory: heapSize,
    } satisfies PerfMetrics;
  });

  return {
    lcp: Number(raw.lcp || 0),
    cls: Number(raw.cls || 0),
    inp: Number(raw.inp || 0),
    memory: Number(raw.memory || 0),
  };
}

type MetricName = 'lcp' | 'inp' | 'cls' | 'memory';

type PerfMetrics = Record<MetricName, number>;

type PerfBudgetsFile = {
  version: number;
  scenarios: Record<string, ScenarioBudgets>;
};

type ScenarioBudgets = {
  description: string;
  metrics: Record<MetricName, MetricBudget>;
};

type MetricBudget = {
  baseline: number;
  maxRegression: number;
  unit?: string;
};

type ScenarioDefinition = {
  id: keyof PerfBudgetsFile['scenarios'];
  url: string;
  description: string;
  run: (page: Page) => Promise<void>;
};

type ScenarioRunRecord = {
  scenario: string;
  description: string;
  metrics: PerfMetrics;
};

type PerfMetricsOnWindow = {
  lcp: number;
  cls: number;
  inp: number;
};

type PerfWindow = Window & { __performanceMetrics: PerfMetricsOnWindow };

type LargestContentfulPaintEntry = PerformanceEntry & {
  renderTime?: number;
  loadTime?: number;
  size?: number;
};

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};
