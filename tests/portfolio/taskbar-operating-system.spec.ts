import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.setTimeout(90000);

async function openApp(page: Page, title: string, id: string) {
  await page.getByRole('button', { name: 'Applications menu', exact: true }).click();
  const menu = page.getByTestId('whisker-menu-dropdown');
  await menu.getByRole('searchbox', { name: 'Search applications' }).fill(title);
  await menu.getByTestId('whisker-menu-app-list').getByRole('button', { name: title, exact: true }).click();
  await expect(page.locator(`#${id}`)).toBeVisible();
}
const task = (page: Page, id: string) => page.getByRole('navigation', { name: 'Desktop taskbar', exact: true }).locator(`button[data-context="taskbar"][data-app-id="${id}"]`);
async function capture(page: Page, name: string, browserName: string) {
  await mkdir('portfolio-screenshots', { recursive: true });
  await page.screenshot({ path: `portfolio-screenshots/${browserName}-taskbar-${name}.png`, animations: 'disabled' });
}

test('real desktop taskbar toggles, previews, keyboard navigation and selective Show desktop', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#about')).toBeVisible();
  await openApp(page, 'Calculator', 'calculator');
  await task(page, 'calculator').click();
  await expect(page.locator('#calculator')).toHaveAttribute('aria-hidden', 'true');
  await expect(task(page, 'calculator')).toHaveAttribute('data-window-state', 'minimized');
  await task(page, 'calculator').click();
  await expect(page.locator('#calculator')).toHaveAttribute('aria-hidden', 'false');
  await expect(task(page, 'calculator')).toHaveAttribute('aria-pressed', 'true');

  await task(page, 'calculator').focus();
  await page.keyboard.press('Home');
  const buttons = page.getByRole('navigation', { name: 'Desktop taskbar', exact: true }).locator('button[data-context="taskbar"]');
  await expect(buttons.first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(buttons.last()).toBeFocused();
  await task(page, 'calculator').focus(); await page.keyboard.press('ArrowDown');
  const preview = page.getByRole('dialog', { name: 'Calculator preview', exact: true });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole('button', { name: 'Minimize Calculator window', exact: true })).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);
  await expect(task(page, 'calculator')).toBeFocused();

  // This minimized app must stay minimized throughout Show desktop / Restore windows.
  await page.locator('#calculator').getByRole('button', { name: 'Window minimize', exact: true }).click();
  await openApp(page, 'Project Gallery', 'project-gallery');
  const panel = page.getByRole('navigation', { name: 'Desktop taskbar', exact: true });
  await panel.getByRole('button', { name: 'Show desktop', exact: true }).click();
  for (const id of ['about', 'calculator', 'project-gallery']) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('aria-hidden', 'true');
  }
  const restore = panel.getByRole('button', { name: 'Restore windows', exact: true });
  await expect(restore).toBeEnabled();
  await capture(page, 'desktop-hidden', browserName);
  await restore.click();
  await expect(page.locator('#about')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#project-gallery')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#calculator')).toHaveAttribute('aria-hidden', 'true');
  await expect(task(page, 'project-gallery')).toHaveAttribute('aria-pressed', 'true');

  await task(page, 'calculator').focus(); await page.keyboard.press('ArrowDown');
  await preview.getByRole('button', { name: 'Restore Calculator window', exact: true }).click();
  await expect(page.locator('#calculator')).toHaveAttribute('aria-hidden', 'false');
  await task(page, 'calculator').focus(); await page.keyboard.press('ArrowDown');
  await preview.getByRole('button', { name: 'Close Calculator', exact: true }).click();
  await expect(page.locator('#calculator')).toHaveCount(0);
  await expect(preview).toHaveCount(0);
  await capture(page, 'desktop', browserName);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test('phone taskbar shares desktop state across toggles, keyboard and rotation', async ({ browser, baseURL, browserName }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: browserName !== 'firefox' });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto('/');
    await expect(page.locator('#about')).toBeVisible();
    await openApp(page, 'Calculator', 'calculator');
    const bar = page.getByRole('navigation', { name: 'Phone taskbar', exact: true });
    await bar.getByRole('button', { name: 'Minimize Calculator', exact: true }).click();
    await expect(page.locator('#calculator')).toHaveAttribute('aria-hidden', 'true');
    await bar.getByRole('button', { name: 'Restore Calculator', exact: true }).click();
    await expect(page.locator('#calculator')).toHaveAttribute('aria-hidden', 'false');
    await bar.getByRole('button', { name: 'Minimize Calculator', exact: true }).focus();
    await page.keyboard.press('Home');
    await expect(bar.getByRole('button', { name: 'Browse applications', exact: true })).toBeFocused();
    await bar.getByRole('button', { name: 'Show desktop', exact: true }).click();
    await expect(page.locator('#calculator')).toHaveAttribute('aria-hidden', 'true');
    await expect(bar.getByRole('button', { name: 'Restore windows', exact: true })).toBeEnabled();
    await page.setViewportSize({ width: 844, height: 390 });
    // Coarse-pointer landscape retains the phone bar; Firefox uses a narrow viewport.
    if (browserName === 'firefox') await page.setViewportSize({ width: 390, height: 844 });
    await bar.getByRole('button', { name: 'Restore windows', exact: true }).click();
    await expect(page.locator('#calculator')).toHaveAttribute('aria-hidden', 'false');
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, 'phone', browserName);
    expect(await bar.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
