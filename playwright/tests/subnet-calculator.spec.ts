import { test, expect, Locator, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

type IpVersion = 'IPv4' | 'IPv6';

interface RandomSubnetCase {
  address: string;
  prefix: number;
  version: IpVersion;
}

const RUN_SUBNET_E2E = (() => {
  const raw =
    process.env.SUBNET_E2E ||
    process.env.PW_SUBNET_E2E ||
    process.env.PLAYWRIGHT_SUBNET ||
    '';
  return ['1', 'true', 'yes'].includes(raw.toLowerCase());
})();

const SUBNET_URL = '/apps/subnet-calculator';

const escapeForSelector = (value: string) =>
  value.replace(/[\0-\x1F\x7F\s!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&');

const readHeapUsage = async (page: Page): Promise<number | null> => {
  try {
    const usage = await page.evaluate(() => {
      const memory = (performance as any).memory;
      if (memory && typeof memory.usedJSHeapSize === 'number') {
        return memory.usedJSHeapSize as number;
      }
      return null;
    });
    return typeof usage === 'number' ? usage : null;
  } catch {
    return null;
  }
};

const locateField = async (
  form: Locator,
  hints: string[],
  tags: Array<'input' | 'textarea'>,
): Promise<Locator> => {
  for (const hint of hints) {
    const labelled = form.getByLabel(new RegExp(hint, 'i'));
    if ((await labelled.count()) > 0) {
      return labelled.first();
    }
  }

  for (const tag of tags) {
    const selector = hints
      .map(
        (hint) =>
          `${tag}[name*="${hint}" i], ${tag}[id*="${hint}" i], ${tag}[placeholder*="${hint}" i], ${tag}[aria-label*="${hint}" i], ${tag}[data-testid*="${hint}" i]`,
      )
      .join(', ');
    if (selector) {
      const candidate = form.locator(selector);
      if ((await candidate.count()) > 0) {
        return candidate.first();
      }
    }
  }

  if (tags.includes('input')) {
    const firstInput = form.locator('input');
    if ((await firstInput.count()) > 0) {
      return firstInput.first();
    }
  }

  throw new Error(`Unable to locate field for hints: ${hints.join(', ')}`);
};

const locateButton = async (
  scope: Page | Locator,
  keywords: string[],
  fallbackSelector?: string,
): Promise<Locator> => {
  for (const keyword of keywords) {
    const button = scope.getByRole('button', { name: new RegExp(keyword, 'i') });
    if ((await button.count()) > 0) {
      return button.first();
    }
  }

  if (fallbackSelector) {
    const fallback = scope.locator(fallbackSelector);
    if ((await fallback.count()) > 0) {
      return fallback.first();
    }
  }

  const submit = scope.locator('button[type="submit"]');
  if ((await submit.count()) > 0) {
    return submit.first();
  }

  throw new Error('Unable to locate action button');
};

const locateImportInput = async (page: Page): Promise<Locator> => {
  const selectors = [
    'input[type="file"][data-testid*="import" i]',
    'input[type="file"][name*="import" i]',
    'input[type="file"][aria-label*="import" i]',
    'input[type="file"][id*="import" i]',
    'input[type="file"][data-testid*="upload" i]',
  ];

  for (const selector of selectors) {
    const input = page.locator(selector);
    if ((await input.count()) > 0) {
      return input.first();
    }
  }

  const label = page.locator('label:has-text("Import"), label:has-text("Upload")');
  if ((await label.count()) > 0) {
    const targetId = await label.first().evaluate((node) => node.getAttribute('for'));
    if (targetId) {
      const input = page.locator(`#${escapeForSelector(targetId)}`);
      if ((await input.count()) > 0) {
        return input.first();
      }
    }
    const nested = label.locator('input[type="file"]');
    if ((await nested.count()) > 0) {
      return nested.first();
    }
  }

  const generic = page.locator('input[type="file"]');
  if ((await generic.count()) > 0) {
    return generic.first();
  }

  throw new Error('Unable to locate file import control');
};

const locateRowLocator = async (page: Page): Promise<Locator> => {
  const containers = [
    '[data-testid*="subnet-results" i]',
    '[data-testid*="subnet-table" i]',
    '[data-testid*="subnet" i]',
    'main',
  ];

  for (const selector of containers) {
    const container = page.locator(selector);
    if ((await container.count()) > 0) {
      return container.locator(
        '[data-testid*="subnet-row" i], table tbody tr, table tr:has(td)',
      );
    }
  }

  return page.locator('table tbody tr');
};

const toggleVersionIfNeeded = async (
  form: Locator,
  version: IpVersion,
): Promise<void> => {
  const radioCandidates = form.locator('input[type="radio"], [role="radio"]');
  if ((await radioCandidates.count()) > 0) {
    const target = radioCandidates.filter({ hasText: new RegExp(version, 'i') });
    if ((await target.count()) > 0) {
      const control = target.first();
      const isActive = await control.evaluate((node) => {
        if (node instanceof HTMLInputElement) {
          return node.checked;
        }
        return (
          node.getAttribute('aria-checked') === 'true' ||
          node.getAttribute('aria-pressed') === 'true'
        );
      });
      if (!isActive) {
        await control.click({ force: true });
      }
      return;
    }
  }

  const select = form.locator('select');
  if ((await select.count()) > 0) {
    try {
      await select.first().selectOption({ label: version });
      return;
    } catch {
      // ignore inability to select by label
    }
  }
};

const buildRandomCases = (total: number): RandomSubnetCase[] => {
  const cases: RandomSubnetCase[] = [];
  for (let i = 0; i < total; i += 1) {
    if (i % 2 === 0) {
      const octets = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256));
      const prefix = Math.floor(Math.random() * 33); // 0-32 inclusive
      cases.push({
        address: octets.join('.'),
        prefix,
        version: 'IPv4',
      });
    } else {
      const segments = Array.from({ length: 8 }, () =>
        Math.floor(Math.random() * 0xffff)
          .toString(16)
          .padStart(4, '0'),
      );
      const prefix = Math.floor(Math.random() * 129); // 0-128 inclusive
      cases.push({
        address: segments.join(':'),
        prefix,
        version: 'IPv6',
      });
    }
  }
  return cases;
};

const computeFocusOrder = async (form: Locator): Promise<string[]> => {
  const descriptors = await form.evaluate((node) => {
    const focusableSelector = 'input, select, textarea, button, [tabindex]';
    const candidates = Array.from(
      node.querySelectorAll<HTMLElement>(focusableSelector),
    ).filter((el) => {
      if (el.hasAttribute('disabled')) return false;
      if (el.tabIndex < 0) return false;
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      return true;
    });
    return candidates.map((el, index) => {
      const descriptor =
        el.dataset.testid ||
        el.id ||
        el.getAttribute('name') ||
        el.getAttribute('aria-label') ||
        el.getAttribute('placeholder') ||
        el.textContent?.trim() ||
        `${el.tagName.toLowerCase()}-${index}`;
      return descriptor;
    });
  });

  const unique: string[] = [];
  descriptors.forEach((value) => {
    if (value && !unique.includes(value)) {
      unique.push(value);
    }
  });
  return unique;
};

const describeActiveElement = (page: Page) =>
  page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return '';
    return (
      active.dataset.testid ||
      active.id ||
      active.getAttribute('name') ||
      active.getAttribute('aria-label') ||
      active.getAttribute('placeholder') ||
      active.textContent?.trim() ||
      active.tagName.toLowerCase()
    );
  });

const adjustPrefixWithArrows = async (prefixField: Locator) => {
  const typeAttr = (await prefixField.getAttribute('type'))?.toLowerCase();
  if (typeAttr !== 'number') return;
  await prefixField.fill('12');
  await prefixField.focus();
  await prefixField.press('ArrowUp');
  const afterUp = Number(await prefixField.inputValue());
  await prefixField.press('ArrowDown');
  const afterDown = Number(await prefixField.inputValue());
  expect(afterUp).toBeGreaterThanOrEqual(12);
  expect(afterDown).toBeLessThanOrEqual(afterUp);
};

const exerciseVersionArrows = async (page: Page, form: Locator) => {
  const radios = form.locator('input[type="radio"], [role="radio"]');
  if ((await radios.count()) < 2) return;

  const ipv4 = radios.filter({ hasText: /ipv4/i }).first();
  const ipv6 = radios.filter({ hasText: /ipv6/i }).first();
  if ((await ipv4.count()) === 0 || (await ipv6.count()) === 0) return;

  await ipv4.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => ipv6.evaluate((node) => node === document.activeElement)).toBeTruthy();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => ipv4.evaluate((node) => node === document.activeElement)).toBeTruthy();
};

const countCsvRows = (csv: string) => {
  const lines = csv.trim().split(/\r?\n/);
  return lines.length > 1 ? lines.length - 1 : 0;
};

if (!RUN_SUBNET_E2E) {
  test.describe.skip(
    'Subnet calculator regression (gated)',
    () => {
      test('subnet calculator tests disabled', () => {
        test.info().annotations.push({ type: 'skip', description: 'Set SUBNET_E2E=1 to enable subnet calculator tests.' });
      });
    },
  );
} else {
  test.describe('Subnet calculator regression', () => {
    test('random IPv4/IPv6 runs export/import without regressions', async ({ page, browserName }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });

      await page.goto(SUBNET_URL, { waitUntil: 'domcontentloaded' });
      const form = page.locator('[data-testid="subnet-form"], form').first();
      await expect(form).toBeVisible();

      const ipField = await locateField(form, ['ip', 'address', 'host', 'cidr'], ['input', 'textarea']);
      const prefixField = await locateField(form, ['prefix', 'cidr', 'mask'], ['input']);
      const submitButton = await locateButton(form, ['add', 'calculate', 'submit', 'generate', 'compute', 'analyze']);
      const exportButton = await locateButton(page, ['export', 'download'], 'button[data-testid*="export" i]');
      const rowsLocator = await locateRowLocator(page);

      await expect(ipField).toBeVisible();
      await expect(prefixField).toBeVisible();
      await expect(submitButton).toBeVisible();
      await expect(exportButton).toBeVisible();

      const initialHeap = await readHeapUsage(page);
      let expectedCount = await rowsLocator.count();

      const cases = buildRandomCases(50);
      for (const entry of cases) {
        await ipField.fill('');
        await prefixField.fill('');
        await ipField.fill(entry.address);
        await prefixField.fill(String(entry.prefix));
        await toggleVersionIfNeeded(form, entry.version);
        await submitButton.click();
        expectedCount += 1;
        await expect(rowsLocator).toHaveCount(expectedCount, { timeout: 15_000 });
      }

      const focusOrder = await computeFocusOrder(form);
      const tabChecks = Math.min(focusOrder.length, 8);
      if (tabChecks > 1) {
        await ipField.focus();
        const visited: string[] = [await describeActiveElement(page)];
        for (let i = 1; i < tabChecks; i += 1) {
          await page.keyboard.press('Tab');
          visited.push(await describeActiveElement(page));
        }
        expect(visited).toEqual(focusOrder.slice(0, tabChecks));
      }

      await adjustPrefixWithArrows(prefixField);
      await exerciseVersionArrows(page, form);

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportButton.click(),
      ]);
      const tempFile = path.join(os.tmpdir(), `subnet-${crypto.randomUUID()}.csv`);
      await download.saveAs(tempFile);
      const csvContent = await fs.readFile(tempFile, 'utf8');
      const csvRows = countCsvRows(csvContent);

      await page.reload({ waitUntil: 'domcontentloaded' });

      const postReloadRows = await locateRowLocator(page);
      const existingCount = await postReloadRows.count();
      const importAfterReload = await locateImportInput(page);
      await importAfterReload.setInputFiles(tempFile);
      await expect(postReloadRows).toHaveCount(
        Math.max(existingCount, csvRows),
        { timeout: 20_000 },
      );

      const finalHeap = await readHeapUsage(page);
      if (initialHeap !== null && finalHeap !== null && browserName === 'chromium') {
        expect(finalHeap - initialHeap).toBeLessThanOrEqual(6 * 1024 * 1024);
      }

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);

      await fs.unlink(tempFile).catch(() => {});
    });
  });
}
