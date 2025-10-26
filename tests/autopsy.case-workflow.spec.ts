import { test, expect, chromium } from '@playwright/test';
import chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const CASE_ALPHA = 'Mock Case Alpha';
const CASE_BETA = 'Mock Case Beta';
const HEAP_BUDGET_BYTES = 8 * 1024 * 1024;

test.describe('Autopsy case workflow', () => {
  test('imports mock cases, inspects previews, and meets quality guardrails', async ({
    page,
    context,
    browserName,
  }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Memory metrics and Lighthouse are only available in Chromium.');
    test.setTimeout(120_000);
    test.slow();

    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (error) => {
      pageErrors.push(error?.message || String(error));
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/apps/autopsy');
    await page.waitForLoadState('networkidle');

    const client = await context.newCDPSession(page);
    const { usedSize: initialHeap } = await client.send('Runtime.getHeapUsage');

    const caseInput = page.getByPlaceholder('Case name');
    const createCaseButton = page.getByRole('button', { name: 'Create Case' });

    await caseInput.fill(CASE_ALPHA);
    await createCaseButton.click();
    await expect(page.getByText(`Current case: ${CASE_ALPHA}`)).toBeVisible();

    await expect(page.getByRole('button', { name: /resume\.docx/i })).toBeVisible();

    await page.getByRole('button', { name: 'notes.txt' }).click();
    const previewSection = page
      .locator('div')
      .filter({ has: page.getByRole('button', { name: 'Hex', exact: true }) })
      .first();
    await expect(previewSection.locator('pre').first()).toContainText('48 65 6c');
    await page.getByRole('button', { name: 'Text', exact: true }).click();
    await expect(previewSection.locator('pre').first()).toContainText('Hello case!');

    await caseInput.fill(CASE_BETA);
    await createCaseButton.click();
    await expect(page.getByText(`Current case: ${CASE_BETA}`)).toBeVisible();
    await expect(page.getByRole('button', { name: /resume\.docx/i })).toBeVisible();

    await caseInput.fill(CASE_ALPHA);
    await createCaseButton.click();
    await expect(page.getByText(`Current case: ${CASE_ALPHA}`)).toBeVisible();

    const artifactCard = page.getByRole('button', { name: /resume\.docx/i }).first();
    await artifactCard.click();
    const closeDetails = page.getByRole('button', { name: 'Close' });
    await expect(closeDetails).toBeVisible();
    await closeDetails.click();
    await expect(closeDetails).not.toBeVisible();

    const { usedSize: finalHeap } = await client.send('Runtime.getHeapUsage');
    const heapGrowth = Math.max(0, finalHeap - initialHeap);
    expect(heapGrowth).toBeLessThanOrEqual(HEAP_BUDGET_BYTES);

    expect(
      pageErrors,
      pageErrors.length ? `Unhandled page errors: ${pageErrors.join(' | ')}` : undefined,
    ).toHaveLength(0);

    const unhandledConsoleErrors = consoleErrors.filter((msg) => /unhandled|rejection/i.test(msg));
    expect(
      unhandledConsoleErrors,
      unhandledConsoleErrors.length
        ? `Unhandled console errors: ${unhandledConsoleErrors.join(' | ')}`
        : undefined,
    ).toHaveLength(0);

    const chrome = await chromeLauncher.launch({
      chromePath: chromium.executablePath(),
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    });

    try {
      const { lhr } = await lighthouse(page.url(), {
        port: chrome.port,
        logLevel: 'error',
        disableFullPageScreenshot: true,
        onlyCategories: ['accessibility'],
      });
      const accessibilityScore = (lhr.categories?.accessibility?.score || 0) * 100;
      expect(accessibilityScore).toBeGreaterThanOrEqual(95);
      await testInfo.attach('lighthouse-accessibility-score', {
        contentType: 'application/json',
        body: Buffer.from(JSON.stringify({ accessibilityScore }, null, 2)),
      });
    } finally {
      await chrome.kill();
    }
  });
});
