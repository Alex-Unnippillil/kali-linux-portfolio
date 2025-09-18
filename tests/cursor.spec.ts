import { test, expect, Page } from '@playwright/test';

async function seedDesktop(page: Page, options: { disabledShortcut?: boolean } = {}) {
  const { disabledShortcut = false } = options;
  await page.addInitScript(({ disabledShortcut: disabled }) => {
    window.localStorage.setItem('booting_screen', 'false');
    window.localStorage.setItem('screen-locked', 'false');
    window.localStorage.setItem('shut-down', 'false');
    window.localStorage.setItem(
      'new_folders',
      disabled
        ? JSON.stringify([{ id: 'qa', name: 'QA Folder' }])
        : '[]',
    );
  }, { disabledShortcut });
}

async function loadDesktop(page: Page, options: { disabledShortcut?: boolean } = {}) {
  await seedDesktop(page, options);
  await page.goto('/');
  await page.waitForSelector('#about-alex', { state: 'visible' });
}

const getBodyCursor = (page: Page) => page.evaluate(() => window.getComputedStyle(document.body).cursor);

test.describe('desktop cursor feedback', () => {
  test('updates cursor while dragging a window', async ({ page }) => {
    await loadDesktop(page);

    await expect.poll(() => getBodyCursor(page)).toBe('default');

    const title = page.locator('#about-alex .bg-ub-window-title').first();
    const box = await title.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 10, { steps: 10 });

    await expect.poll(() => getBodyCursor(page)).toBe('move');

    await page.mouse.up();
    await expect.poll(() => getBodyCursor(page)).toBe('default');
  });

  test('shows busy cursor while resizing a window', async ({ page }) => {
    await loadDesktop(page);
    await expect.poll(() => getBodyCursor(page)).toBe('default');

    const handle = page.locator('#about-alex .cursor-\\[e-resize\\]').first();
    await handle.waitFor({ state: 'visible' });
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + 2, box.y + 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 30, box.y + 2, { steps: 10 });

    await expect.poll(() => getBodyCursor(page)).toBe('progress');

    await page.mouse.up();
    await expect.poll(() => getBodyCursor(page)).toBe('default');
  });

  test('uses copy cursor when dragging a desktop shortcut', async ({ page }) => {
    await loadDesktop(page);
    await expect.poll(() => getBodyCursor(page)).toBe('default');

    const icon = page.locator('[data-context="app"]').first();
    await icon.waitFor({ state: 'visible' });
    const box = await icon.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2, { steps: 10 });

    await expect.poll(() => getBodyCursor(page)).toBe('copy');

    await page.mouse.up();
    await expect.poll(() => getBodyCursor(page)).toBe('default');
  });

  test('blocks dragging for disabled shortcuts with a not-allowed cursor', async ({ page }) => {
    await loadDesktop(page, { disabledShortcut: true });
    await expect.poll(() => getBodyCursor(page)).toBe('default');

    const disabledIcon = page.locator('#app-new-folder-qa');
    await disabledIcon.waitFor({ state: 'visible' });
    const box = await disabledIcon.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10, { steps: 5 });

    await expect.poll(() => getBodyCursor(page)).toBe('not-allowed');

    await page.mouse.up();
    await expect.poll(() => getBodyCursor(page)).toBe('default');
  });
});
