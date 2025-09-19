import { test, expect, Page } from '@playwright/test';

const APPS_TO_OPEN = ['youtube', 'terminal', 'calculator', 'vscode'];
const ORDERED_APPS = ['calculator', 'terminal', 'vscode', 'youtube'];

type Alignment = 'left' | 'center' | 'right';

async function openApps(page: Page, apps: string[]) {
  await page.evaluate((ids) => {
    ids.forEach((id) => {
      window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    });
  }, apps);
  await page.waitForFunction(
    (ids) => ids.every((id) => document.querySelector(`button[data-app-id="${id}"]`)),
    apps,
  );
}

async function getTaskbarOrder(page: Page, subset: string[]) {
  return page.$$eval(
    'button[data-app-id]',
    (buttons, ids) => {
      const set = new Set(ids);
      return buttons
        .map((btn) => btn.getAttribute('data-app-id') || '')
        .filter((id) => set.has(id));
    },
    subset,
  );
}

async function assertNoOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    const toolbar = document.querySelector('[role="toolbar"]');
    if (!toolbar) return false;
    const rect = toolbar.getBoundingClientRect();
    return Array.from(toolbar.querySelectorAll('button[data-app-id]')).some((button) => {
      const b = button.getBoundingClientRect();
      return b.right > rect.right + 1 || b.left < rect.left - 1;
    });
  });
  expect(hasOverflow).toBe(false);
}

test.describe('Taskbar layout', () => {
  const alignments: Alignment[] = ['left', 'center', 'right'];

  for (const alignment of alignments) {
    test(`maintains order without overflow when aligned ${alignment}`, async ({ page }) => {
      await page.addInitScript((settings) => {
        window.localStorage.clear();
        window.localStorage.setItem('taskbar-alignment', settings.alignment);
        window.localStorage.setItem('taskbar-compact', 'false');
      }, { alignment });

      await page.goto('/');
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForSelector('[role="toolbar"]');

      await openApps(page, APPS_TO_OPEN);
      const order = await getTaskbarOrder(page, ORDERED_APPS);
      expect(order).toEqual(ORDERED_APPS);
      await assertNoOverflow(page);

      await page.setViewportSize({ width: 640, height: 720 });
      await page.waitForTimeout(100);
      const orderAfterResize = await getTaskbarOrder(page, ORDERED_APPS);
      expect(orderAfterResize).toEqual(ORDERED_APPS);
      await assertNoOverflow(page);
    });
  }

  test('compact mode hides labels and prevents overflow on tight layouts', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem('taskbar-alignment', 'center');
      window.localStorage.setItem('taskbar-compact', 'true');
    });

    await page.goto('/');
    await page.setViewportSize({ width: 480, height: 720 });
    await page.waitForSelector('[role="toolbar"]');

    await openApps(page, APPS_TO_OPEN);
    await assertNoOverflow(page);

    const labelsVisible = await page.$$eval('.taskbar__label', (labels) =>
      labels.some((label) => window.getComputedStyle(label).display !== 'none'),
    );
    expect(labelsVisible).toBe(false);

    await page.setViewportSize({ width: 360, height: 720 });
    await page.waitForTimeout(100);
    await assertNoOverflow(page);
  });
});
