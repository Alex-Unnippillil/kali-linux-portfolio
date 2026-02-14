import { expect, test, type Page } from '@playwright/test';

const MB = 1024 * 1024;

type ListenerTotals = {
  added: number;
  removed: number;
  active: Record<string, number>;
};

type ListenerKey = 'window' | 'document';

type ListenerSnapshot = Record<ListenerKey, ListenerTotals>;

declare global {
  interface Window {
    __getListenerStats?: () => ListenerSnapshot;
  }
}

const summarizeActive = (stats: ListenerSnapshot) => ({
  window: stats['window']?.active ?? {},
  document: stats['document']?.active ?? {},
});

const readListenerStats = async (page: Page): Promise<ListenerSnapshot> =>
  page.evaluate(() => {
    const fallback = {
      window: { added: 0, removed: 0, active: {} },
      document: { added: 0, removed: 0, active: {} },
    };
    const stats = window.__getListenerStats?.();
    return stats ?? fallback;
  });

const runLabCycle = async (page: Page) => {
  await expect(page.getByRole('heading', { name: 'Disclaimer' })).toBeVisible();
  await page.getByRole('button', { name: /Begin/i }).click();

  const steps: Array<{
    title: string;
    action?: () => Promise<void>;
  }> = [
    {
      title: 'Sandboxed Target',
      action: async () => {
        const sandboxFrame = page.frameLocator('iframe[title="sandbox"]');
        await expect(sandboxFrame.locator('body')).toContainText('Sandboxed Target Page');
      },
    },
    {
      title: 'Simulated Hook',
      action: async () => {
        await expect(
          page.getByText('The target has been locally “hooked”. No packets left this machine.'),
        ).toBeVisible();
      },
    },
    {
      title: 'Run Demo Module',
      action: async () => {
        await expect(page.locator('pre')).toContainText('Demo module executed');
      },
    },
    {
      title: 'Payload Builder',
      action: async () => {
        const select = page.getByLabel('Payload:');
        const textarea = page.locator('textarea');
        const sequence: Array<{ label: string; snippet: string }> = [
          { label: 'Alert Box', snippet: "alert('BeEF demo payload');" },
          { label: 'Console Log', snippet: "console.log('BeEF demo payload executed');" },
          { label: 'Change Background', snippet: "document.body.style.background='lightyellow';" },
          { label: 'Alert Box', snippet: "alert('BeEF demo payload');" },
          { label: 'Console Log', snippet: "console.log('BeEF demo payload executed');" },
        ];

        for (const { label, snippet } of sequence) {
          await select.selectOption(label);
          await expect(textarea).toContainText(snippet);
        }
      },
    },
  ];

  for (const step of steps) {
    await expect(page.getByRole('heading', { name: step.title })).toBeVisible();
    if (step.action) {
      await step.action();
    }
    await page.getByRole('button', { name: 'Next' }).click();
  }

  await expect(page.getByRole('heading', { name: 'Complete' })).toBeVisible();
};

test.describe('BeEF hook lifecycle', () => {
  test('connects, runs demos, disconnects cleanly', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    await page.addInitScript(() => {
      const tracked = new WeakSet<EventTarget>();
      tracked.add(window);
      tracked.add(document);

      const records = new Map<EventTarget, { added: number; removed: number; active: Map<string, number> }>();

      const getRecord = (target: EventTarget) => {
        let record = records.get(target);
        if (!record) {
          record = { added: 0, removed: 0, active: new Map<string, number>() };
          records.set(target, record);
        }
        return record;
      };

      getRecord(window);
      getRecord(document);

      const originalAdd = EventTarget.prototype.addEventListener;
      const originalRemove = EventTarget.prototype.removeEventListener;

      EventTarget.prototype.addEventListener = function (type, listener, options) {
        originalAdd.call(this, type, listener, options);
        if (tracked.has(this)) {
          const record = getRecord(this);
          record.added += 1;
          record.active.set(type, (record.active.get(type) || 0) + 1);
        }
      };

      EventTarget.prototype.removeEventListener = function (type, listener, options) {
        originalRemove.call(this, type, listener, options);
        if (tracked.has(this)) {
          const record = getRecord(this);
          record.removed += 1;
          const current = record.active.get(type) || 0;
          if (current <= 1) {
            record.active.delete(type);
          } else {
            record.active.set(type, current - 1);
          }
        }
      };

      window.__getListenerStats = () => {
        const snapshot: ListenerSnapshot = {
          window: { added: 0, removed: 0, active: {} },
          document: { added: 0, removed: 0, active: {} },
        };

        [window, document].forEach((target) => {
          const record = getRecord(target);
          const active: Record<string, number> = {};
          record.active.forEach((count, eventName) => {
            if (count > 0) {
              active[eventName] = count;
            }
          });

          const key = target === window ? 'window' : 'document';
          snapshot[key as keyof ListenerSnapshot] = {
            added: record.added,
            removed: record.removed,
            active,
          };
        });

        return snapshot;
      };
    });

    await page.goto('/apps/beef');
    await expect(page.getByRole('heading', { name: 'BeEF Demo' })).toBeVisible();

    const baselineListeners = await readListenerStats(page);

    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    const getHeapUsage = async () => {
      const { metrics } = await client.send('Performance.getMetrics');
      const entry = metrics.find((metric: { name: string }) => metric.name === 'JSHeapUsedSize');
      return entry ? entry.value : 0;
    };

    const baselineHeap = await getHeapUsage();

    await runLabCycle(page);

    await page.getByRole('button', { name: /Reset Lab/i }).click();
    await expect(page.getByRole('heading', { name: 'Disclaimer' })).toBeVisible();

    const afterFirstResetListeners = await readListenerStats(page);
    expect(summarizeActive(afterFirstResetListeners)).toEqual(summarizeActive(baselineListeners));

    const afterFirstResetHeap = await getHeapUsage();
    const firstGrowth = Math.max(0, afterFirstResetHeap - baselineHeap);
    expect(firstGrowth).toBeLessThanOrEqual(7 * MB);

    await runLabCycle(page);

    await page.getByRole('button', { name: /Reset Lab/i }).click();
    await expect(page.getByRole('heading', { name: 'Disclaimer' })).toBeVisible();

    const finalListeners = await readListenerStats(page);
    expect(summarizeActive(finalListeners)).toEqual(summarizeActive(baselineListeners));

    const finalHeap = await getHeapUsage();
    const secondGrowth = Math.max(0, finalHeap - baselineHeap);
    expect(secondGrowth).toBeLessThanOrEqual(7 * MB);

    expect(warnings, 'console warnings').toEqual([]);
  });
});
