import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function openApp(page: Page, title: string, id: string) {
  await page.getByRole('button', { name: 'Applications menu', exact: true }).click();
  const menu = page.getByTestId('whisker-menu-dropdown');
  await menu.getByRole('searchbox', { name: 'Search applications' }).fill(title);
  await menu.getByTestId('whisker-menu-app-list').getByRole('button', { name: title, exact: true }).click();
  await expect(page.locator(`#${id}`)).toBeVisible();
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test('desktop taskbar controls the real window manager and preserves calculator input', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#about')).toBeVisible();
  await openApp(page, 'Calculator', 'calculator');
  const calculator = page.locator('#calculator');
  const display = calculator.getByLabel('Calculator display');
  await expect(calculator.locator('.calculator')).toHaveAttribute('data-ready', 'true');
  await display.fill('6*7');
  await display.press('Enter');
  await expect(display).toHaveValue('42');
  await openApp(page, 'Sticky Notes', 'sticky_notes');

  const bar = page.getByRole('navigation', { name: 'Desktop taskbar' });
  const calcButton = bar.locator('button[data-context="taskbar"][data-app-id="calculator"]');
  const notesButton = bar.locator('button[data-context="taskbar"][data-app-id="sticky_notes"]');
  await expect(notesButton).toHaveAttribute('aria-pressed', 'true');
  await expect(calcButton).toHaveAttribute('data-window-state', 'running');
  await calcButton.click();
  await expect(calcButton).toHaveAttribute('aria-pressed', 'true');
  await expect(notesButton).toHaveAttribute('aria-pressed', 'false');
  await calcButton.click();
  await expect(calculator).toHaveAttribute('aria-hidden', 'true');
  await expect(calcButton).toHaveAttribute('data-window-state', 'minimized');
  await expect(calcButton.getByTestId('running-indicator')).toBeVisible();
  await calcButton.click();
  await expect(calculator).toHaveAttribute('aria-hidden', 'false');
  await expect(display).toHaveValue('42');

  // Keyboard preview actions must not depend on thumbnail capture succeeding.
  await calcButton.press('ArrowDown');
  const preview = page.getByRole('dialog', { name: 'Calculator preview', exact: true });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole('button', { name: 'Switch to Calculator', exact: true })).toBeFocused();
  await preview.getByRole('button', { name: 'Switch to Calculator', exact: true }).press('Escape');
  await expect(preview).toHaveCount(0);
  await expect(calcButton).toBeFocused();

  const buttons = bar.locator('button[data-context="taskbar"]');
  await calcButton.press('Home');
  await expect(buttons.first()).toBeFocused();
  await buttons.first().press('End');
  await expect(buttons.last()).toBeFocused();
  await buttons.last().press('ArrowRight');
  await expect(buttons.first()).toBeFocused();

  await calcButton.press('ArrowDown');
  await preview.getByRole('button', { name: 'Minimize Calculator window', exact: true }).click();
  await expect(calculator).toHaveAttribute('aria-hidden', 'true');
  await calcButton.press('ArrowDown');
  await preview.getByRole('button', { name: 'Restore Calculator', exact: true }).click();
  await expect(calculator).toHaveAttribute('aria-hidden', 'false');
  await expect(display).toHaveValue('42');
  await calcButton.press('ArrowDown');
  await expect(preview).toBeVisible();
  await mkdir('portfolio-screenshots', { recursive: true });
  await page.screenshot({ path: `portfolio-screenshots/${browserName}-taskbar-preview.png`, animations: 'disabled' });
  await preview.getByRole('button', { name: 'Close Calculator', exact: true }).click();
  await expect(calculator).toHaveCount(0);
  await expect(preview).toHaveCount(0);
  await expect(page.locator('#sticky_notes')).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('phone taskbar supports minimize, restore, keyboard navigation and rotation', async ({ browser, browserName, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: browserName !== 'firefox',
    isMobile: browserName !== 'firefox',
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto('/');
    await expect(page.locator('#about')).toBeVisible();
    await openApp(page, 'Calculator', 'calculator');
    const calculator = page.locator('#calculator');
    const display = calculator.getByLabel('Calculator display');
    await expect(calculator.locator('.calculator')).toHaveAttribute('data-ready', 'true');
    await display.fill('7*8');
    await display.press('Enter');
    await expect(display).toHaveValue('56');
    const bar = page.getByRole('navigation', { name: 'Phone taskbar' });
    const calcButton = bar.locator('button[data-app-id="calculator"]');
    await expect(calcButton).toHaveAccessibleName('Minimize Calculator');
    const bounds = await calcButton.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    await calcButton.click();
    await expect(calculator).toHaveAttribute('aria-hidden', 'true');
    await expect(calcButton).toHaveAccessibleName('Restore Calculator');
    await expect(calcButton).toHaveAttribute('data-window-state', 'minimized');
    await calcButton.click();
    await expect(calculator).toHaveAttribute('aria-hidden', 'false');
    await expect(display).toHaveValue('56');
    await openApp(page, 'Sticky Notes', 'sticky_notes');
    await expect(calcButton).toHaveAccessibleName('Switch to Calculator');
    const buttons = bar.locator('button[data-app-id]');
    await calcButton.press('Home');
    await expect(buttons.first()).toBeFocused();
    await buttons.first().press('End');
    await expect(buttons.last()).toBeFocused();
    await buttons.last().press('ArrowRight');
    await expect(buttons.first()).toBeFocused();
    await calcButton.click();
    await expect(display).toHaveValue('56');
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(calculator).toBeVisible();
    await noOverflow(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(bar).toBeVisible();
    await expect(display).toHaveValue('56');
    await noOverflow(page);
    await mkdir('portfolio-screenshots', { recursive: true });
    await page.screenshot({ path: `portfolio-screenshots/${browserName}-phone-taskbar.png`, animations: 'disabled' });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
