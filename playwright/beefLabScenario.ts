import { expect, Page } from '@playwright/test';

export interface BeefLabScenarioOptions {
  runs?: number;
}

export interface BeefLabScenarioResult {
  warnings: string[];
  memoryReadings: number[];
  maxDeltaBytes: number | null;
}

async function readUsedHeap(page: Page): Promise<number | null> {
  try {
    const value = await page.evaluate(() => {
      const perf = performance as Performance & { memory?: { usedJSHeapSize?: number } };
      if (!perf.memory || typeof perf.memory.usedJSHeapSize !== 'number') {
        return null;
      }
      return perf.memory.usedJSHeapSize;
    });
    return typeof value === 'number' ? value : null;
  } catch {
    return null;
  }
}

async function ensureAtDisclaimer(page: Page) {
  await expect(page.getByRole('heading', { name: /Disclaimer/i })).toBeVisible();
}

async function connectToLab(page: Page) {
  await ensureAtDisclaimer(page);
  const beginButton = page.getByRole('button', { name: /Begin/i });
  await expect(beginButton).toBeEnabled();
  await beginButton.click();
  await expect(page.getByRole('heading', { name: /Sandboxed Target/i })).toBeVisible();
}

async function advanceToDemo(page: Page) {
  await expect(page.getByRole('heading', { name: /Sandboxed Target/i })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await expect(page.getByRole('heading', { name: /Simulated Hook/i })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await expect(page.getByRole('heading', { name: /Run Demo Module/i })).toBeVisible();
  const output = page.locator('pre');
  await expect(output).toContainText('Demo module executed');
  await expect(output).toContainText('Result: success');
}

async function interactWithPayloadBuilder(page: Page, iteration: number) {
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Payload Builder/i })).toBeVisible();

  const payloadSelect = page.getByLabel('Payload:');
  if (await payloadSelect.isVisible()) {
    const options = await payloadSelect.locator('option').all();
    if (options.length > 0) {
      const option = options[iteration % options.length];
      const value = (await option.getAttribute('value')) ?? (await option.textContent()) ?? undefined;
      if (value) {
        await payloadSelect.selectOption(value);
      }
    }
  }

  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Complete/i })).toBeVisible();
}

async function resetLab(page: Page) {
  const resetButton = page.getByRole('button', { name: /Reset Lab/i });
  await expect(resetButton).toBeVisible();
  await resetButton.click();
  await ensureAtDisclaimer(page);
}

export async function runBeefLabScenario(
  page: Page,
  options: BeefLabScenarioOptions = {},
): Promise<BeefLabScenarioResult> {
  const runs = Math.max(1, options.runs ?? 5);
  const warnings: string[] = [];
  const memoryReadings: number[] = [];

  const warningListener = (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  };

  page.on('console', warningListener);

  try {
    await page.goto('/apps/beef', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /BeEF Demo/i })).toBeVisible({ timeout: 45_000 });
    const initialMemory = await readUsedHeap(page);
    if (initialMemory !== null) {
      memoryReadings.push(initialMemory);
    }

    for (let i = 0; i < runs; i += 1) {
      await connectToLab(page);
      await advanceToDemo(page);
      await interactWithPayloadBuilder(page, i);
      const reading = await readUsedHeap(page);
      if (reading !== null) {
        memoryReadings.push(reading);
      }
      await resetLab(page);
    }

    await connectToLab(page);
    const finalReading = await readUsedHeap(page);
    if (finalReading !== null) {
      memoryReadings.push(finalReading);
    }
    await page.goto('/apps/beef', { waitUntil: 'networkidle' });
    await ensureAtDisclaimer(page);
  } finally {
    page.off('console', warningListener);
  }

  let maxDelta: number | null = null;
  if (memoryReadings.length > 1) {
    const baseline = memoryReadings[0];
    maxDelta = memoryReadings.reduce((max, value) => {
      const delta = value - baseline;
      return delta > max ? delta : max;
    }, 0);
  }

  return {
    warnings,
    memoryReadings,
    maxDeltaBytes: maxDelta,
  };
}
