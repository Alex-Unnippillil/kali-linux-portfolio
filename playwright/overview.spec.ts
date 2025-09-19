import { test, expect, Page } from '@playwright/test';

const escapeCssId = (id: string) => id.replace(/([\.#:[\],=])/g, '\\$1');

const openContextMenu = async (page: Page, selector: string) => {
  await page.evaluate((sel) => {
    const target = document.querySelector<HTMLElement>(sel);
    if (!target) {
      throw new Error(`Unable to find element for selector: ${sel}`);
    }
    const rect = target.getBoundingClientRect();
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    });
    target.dispatchEvent(event);
  }, selector);
};

test('overview handles heavy multi-window interaction without leaks', async ({ page, context }) => {
  const consoleErrors: string[] = [];
  const pageErrors: Error[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error);
  });

  await context.addInitScript(() => {
    window.localStorage.setItem('booting_screen', 'false');
    window.localStorage.setItem('screen-locked', 'false');
    window.localStorage.setItem('shut-down', 'false');
    window.localStorage.removeItem('pinnedApps');
    window.localStorage.removeItem('app_shortcuts');
    window.localStorage.removeItem('new_folders');
    window.localStorage.removeItem('frequentApps');
    window.localStorage.removeItem('recentApps');
    window.localStorage.removeItem('window-trash');
  });

  await page.goto('/');
  await page.waitForSelector('#window-area');

  const session = await context.newCDPSession(page);
  const getHeapUsage = async () => {
    const { metrics } = await session.send('Performance.getMetrics');
    const heap = metrics.find((metric: { name: string; value: number }) => metric.name === 'JSHeapUsedSize');
    return heap?.value ?? 0;
  };

  const initialHeap = await getHeapUsage();

  const openFromDock = async (id: string) => {
    const button = page.locator(`nav[aria-label="Dock"] button[data-app-id="${id}"]`);
    await button.click();
    await expect(page.locator(`#${escapeCssId(id)}`)).toBeVisible();
  };

  const openFromDesktop = async (id: string) => {
    const icon = page.locator(`#desktop [data-app-id="${id}"]`).first();
    await icon.dblclick();
    await expect(page.locator(`#${escapeCssId(id)}`)).toBeVisible();
  };

  const overviewButton = page.locator('nav[aria-label="Dock"] img[alt="Ubuntu view app"]').first();
  const openFromOverview = async (id: string, query: string) => {
    await overviewButton.click();
    const overlay = page.locator('.all-apps-anim');
    await overlay.waitFor();
    const searchInput = overlay.locator('input');
    await searchInput.fill('');
    await searchInput.fill(query);
    const icon = overlay.locator(`[data-app-id="${id}"]`).first();
    await icon.waitFor();
    await icon.dblclick();
    await overlay.waitFor({ state: 'detached' });
    await expect(page.locator(`#${escapeCssId(id)}`)).toBeVisible();
  };

  await openFromDesktop('about');
  await openFromDesktop('gedit');
  await openFromDesktop('trash');

  for (const id of ['chrome', 'terminal', 'vscode', 'x', 'spotify', 'youtube', 'settings']) {
    await openFromDock(id);
  }

  await openFromOverview('resource-monitor', 'Resource');
  await openFromOverview('screen-recorder', 'Recorder');
  await openFromOverview('converter', 'Converter');
  await openFromOverview('todoist', 'Todoist');
  await openFromOverview('hashcat', 'Hashcat');

  await expect(page.locator('.opened-window')).toHaveCount(15);

  await openContextMenu(page, '[data-context="desktop-area"]');
  const desktopMenu = page.locator('#desktop-menu');
  await expect(desktopMenu).toBeVisible();
  await desktopMenu.getByRole('menuitem', { name: 'New Folder' }).click();

  const folderName = 'Test Group';
  await page.locator('#folder-name-input').fill(folderName);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('[data-app-id="new-folder-test-group"]')).toBeVisible();

  await openContextMenu(page, '#desktop [data-app-id="gedit"]');
  const appMenu = page.locator('#app-menu');
  await expect(appMenu).toBeVisible();
  await appMenu.getByRole('menuitem', { name: 'Pin to Favorites' }).click();
  await expect(async () => {
    const pinned = await page.evaluate(() => JSON.parse(window.localStorage.getItem('pinnedApps') || '[]'));
    expect(pinned).toContain('gedit');
  }).toPass();

  await openContextMenu(page, '#desktop [data-app-id="gedit"]');
  await expect(appMenu).toBeVisible();
  await appMenu.getByRole('menuitem', { name: 'Unpin from Favorites' }).click();
  await expect(async () => {
    const pinned = await page.evaluate(() => JSON.parse(window.localStorage.getItem('pinnedApps') || '[]'));
    expect(pinned).not.toContain('gedit');
  }).toPass();

  await openContextMenu(page, 'div[role="toolbar"] button[data-app-id="chrome"]');
  const taskbarMenu = page.locator('#taskbar-menu');
  await expect(taskbarMenu).toBeVisible();
  await taskbarMenu.getByRole('menuitem', { name: 'Minimize' }).click();
  await expect(page.locator('#chrome')).toHaveClass(/invisible/);

  await overviewButton.click();
  await expect(page.locator('.all-apps-anim')).toBeVisible();
  await overviewButton.click();
  await expect(page.locator('.all-apps-anim')).toHaveCount(0);

  const finalHeap = await getHeapUsage();
  if (initialHeap > 0 && finalHeap > 0) {
    expect(finalHeap - initialHeap).toBeLessThan(80 * 1024 * 1024);
  }

  expect(pageErrors).toHaveLength(0);
  expect(consoleErrors).toHaveLength(0);
});
