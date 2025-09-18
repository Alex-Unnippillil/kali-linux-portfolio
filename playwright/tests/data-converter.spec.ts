import { expect, test } from '@playwright/test';

const JSON_SAMPLE = {
  service: 'converter',
  version: 1,
  payload: {
    name: 'Kali',
    count: 3,
    tags: ['linux', 'security'],
  },
};

const yamlMatcher = /service: converter[\s\S]*version: 1[\s\S]*tags:\s*- linux[\s\S]*- security/;

test('data converter end-to-end workflow', async ({ page }) => {
  const response = await page.goto('/apps/data-converter');
  test.skip(response?.status() === 404, 'Data converter app not available');

  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  const startHeap = await page.evaluate(() => {
    const memory = (performance as any).memory;
    return memory?.usedJSHeapSize ?? null;
  });

  const labeledJson = page.getByLabel(/json/i);
  const jsonEditor = (await labeledJson.count()) > 0
    ? labeledJson.first()
    : page.locator('textarea').first();
  await expect(jsonEditor, 'JSON editor should be visible').toBeVisible();
  await jsonEditor.fill(JSON.stringify(JSON_SAMPLE));

  await page.getByRole('button', { name: /format/i }).click();
  await expect(jsonEditor).toContainText('"service": "converter"');
  await expect(jsonEditor).toContainText('\n');

  const labeledYaml = page.getByLabel(/yaml/i);
  const yamlEditor = (await labeledYaml.count()) > 0
    ? labeledYaml.first()
    : page.locator('textarea').nth(1);
  await expect(yamlEditor, 'YAML editor should be visible').toBeVisible();

  await page.getByRole('button', { name: /(convert|to)\s*yaml/i }).click();
  await expect(yamlEditor).toHaveValue(yamlMatcher);

  await page.getByRole('button', { name: /validate/i }).click();
  const statusRegion = page
    .locator('[role="status"], [aria-live]')
    .filter({ hasText: /valid/i });
  if ((await statusRegion.count()) > 0) {
    await expect(statusRegion.first()).toBeVisible();
  } else {
    await expect(page.getByText(/valid/i)).toBeVisible();
  }

  const copyButtons = page.getByRole('button', { name: /copy/i });
  const copyCount = await copyButtons.count();
  expect(copyCount, 'expected at least one copy button').toBeGreaterThan(0);

  await copyButtons.first().focus();
  for (let i = 0; i < copyCount; i++) {
    const button = copyButtons.nth(i);
    await expect(button).toBeFocused();
    if (i < copyCount - 1) {
      let reachedNext = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        await page.keyboard.press('Tab');
        if (await copyButtons.nth(i + 1).isFocused()) {
          reachedNext = true;
          break;
        }
      }
      expect(reachedNext, 'Keyboard tabbing should reach the next copy button').toBeTruthy();
    }
  }

  await page.getByRole('button', { name: /clear/i }).click();
  await expect(jsonEditor).toHaveValue('');
  await expect(yamlEditor).toHaveValue('');

  expect(consoleErrors, 'expected no console errors during workflow').toHaveLength(0);

  const endHeap = await page.evaluate(() => {
    const memory = (performance as any).memory;
    return memory?.usedJSHeapSize ?? null;
  });

  if (startHeap !== null && endHeap !== null) {
    const diff = endHeap - startHeap;
    const limit = 6 * 1024 * 1024; // 6 MB
    expect(diff, `heap increase ${diff} should be <= ${limit}`).toBeLessThanOrEqual(limit);
  }
});
