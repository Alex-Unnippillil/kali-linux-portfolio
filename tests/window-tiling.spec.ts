import { test, expect, Page } from '@playwright/test';

type TemplateConfig = {
  id: string;
  rows: number;
  cols: number;
};

const templates: TemplateConfig[] = [
  { id: '2x2', rows: 2, cols: 2 },
  { id: '1x3', rows: 1, cols: 3 },
  { id: '2x3', rows: 2, cols: 3 },
];

const TILING_DIALOG_LABEL = 'Choose window tiling layout';

async function openTilingOverlay(page: Page, windowName: string) {
  const titleBar = page.getByRole('button', { name: windowName }).first();
  await expect(titleBar).toBeVisible();
  const box = await titleBar.boundingBox();
  if (!box) throw new Error(`Unable to measure title bar for ${windowName}`);

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  await page.mouse.move(centerX, centerY);
  await page.keyboard.down('Control');
  await page.mouse.down();
  await page.mouse.move(centerX + 20, centerY, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Control');

  const overlay = page.getByRole('dialog', { name: TILING_DIALOG_LABEL });
  await expect(overlay).toBeVisible();
  return overlay;
}

async function computeExpectedRect(
  page: Page,
  template: TemplateConfig,
  cellIndex: number,
) {
  return page.evaluate(
    ({ template, cellIndex }) => {
      let snapEnabled = true;
      try {
        const stored = window.localStorage.getItem('snap-enabled');
        if (stored !== null) {
          snapEnabled = JSON.parse(stored);
        }
      } catch (e) {
        snapEnabled = true;
      }
      const gridSize = snapEnabled ? 8 : 1;
      const snap = (value: number) =>
        gridSize <= 1 ? value : Math.round(value / gridSize) * gridSize;
      const area = document.getElementById('window-area');
      const areaRect = area ? area.getBoundingClientRect() : null;
      const areaWidth = areaRect ? areaRect.width : window.innerWidth;
      const areaHeight = areaRect ? areaRect.height : window.innerHeight;
      const cols = template.cols || 1;
      const rows = template.rows || 1;
      const col = cellIndex % cols;
      const row = Math.floor(cellIndex / cols);
      const cellWidth = areaWidth / cols;
      const cellHeight = areaHeight / rows;
      const snappedWidth = snap(cellWidth);
      const snappedHeight = snap(cellHeight);
      let x = snap(col * cellWidth);
      let y = snap(row * cellHeight);
      const maxX = Math.max(areaWidth - snappedWidth, 0);
      const maxY = Math.max(areaHeight - snappedHeight, 0);
      if (x > maxX) x = snap(maxX);
      if (y > maxY) y = snap(maxY);
      return {
        x,
        y,
        width: snappedWidth,
        height: snappedHeight,
      };
    },
    { template, cellIndex },
  );
}

async function getWindowRect(page: Page, name: string) {
  return page.evaluate((ariaLabel) => {
    const node = document.querySelector(
      `[role="dialog"][aria-label="${ariaLabel}"]`,
    ) as HTMLElement | null;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }, name);
}

async function applyTemplate(
  page: Page,
  windowName: string,
  template: TemplateConfig,
  templateCell: number,
) {
  const overlay = await openTilingOverlay(page, windowName);
  await page.locator(`[data-template="${template.id}"]`).click();
  await expect(overlay).toBeHidden();

  const expected = await computeExpectedRect(page, template, templateCell);
  await page.waitForFunction(
    ({ name, expected }) => {
      const node = document.querySelector(
        `[role="dialog"][aria-label="${name}"]`,
      ) as HTMLElement | null;
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      return (
        Math.abs(rect.x - expected.x) <= 2 &&
        Math.abs(rect.y - expected.y) <= 2 &&
        Math.abs(rect.width - expected.width) <= 4 &&
        Math.abs(rect.height - expected.height) <= 4
      );
    },
    { name: windowName, expected },
  );

  const firstRect = await getWindowRect(page, windowName);
  if (!firstRect) throw new Error(`Window ${windowName} not found`);
  await page.waitForTimeout(150);
  const secondRect = await getWindowRect(page, windowName);
  if (!secondRect) throw new Error(`Window ${windowName} not found`);
  expect(Math.abs(secondRect.x - firstRect.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(secondRect.y - firstRect.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(secondRect.width - firstRect.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(secondRect.height - firstRect.height)).toBeLessThanOrEqual(1);

  return firstRect;
}

test.describe('window tiling overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.removeItem('window-tiling-templates');
        window.localStorage.setItem('snap-enabled', 'true');
      } catch (e) {
        // ignore storage reset failures
      }
    });
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: 'About Alex' })).toBeVisible();
  });

  for (const template of templates) {
    test(`applies ${template.id} layout without jitter`, async ({ page }) => {
      const rect = await applyTemplate(page, 'About Alex', template, 0);
      const expected = await computeExpectedRect(page, template, 0);
      expect(Math.abs(rect.x - expected.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(rect.y - expected.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(rect.width - expected.width)).toBeLessThanOrEqual(4);
      expect(Math.abs(rect.height - expected.height)).toBeLessThanOrEqual(4);
    });
  }

  test('tiles multiple windows sequentially in the same template', async ({ page }) => {
    await applyTemplate(page, 'About Alex', templates[0], 0);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-app', { detail: 'terminal' }));
    });
    await expect(page.getByRole('dialog', { name: 'Terminal' })).toBeVisible();

    const terminalRect = await applyTemplate(page, 'Terminal', templates[0], 1);
    const aboutRect = await getWindowRect(page, 'About Alex');
    if (!aboutRect) throw new Error('About Alex window missing after tiling');

    const expectedAbout = await computeExpectedRect(page, templates[0], 0);
    expect(Math.abs(aboutRect.x - expectedAbout.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(aboutRect.y - expectedAbout.y)).toBeLessThanOrEqual(2);

    const expectedTerminal = await computeExpectedRect(page, templates[0], 1);
    expect(Math.abs(terminalRect.x - expectedTerminal.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(terminalRect.y - expectedTerminal.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(aboutRect.x - terminalRect.x)).toBeGreaterThanOrEqual(aboutRect.width - 8);
  });
});
