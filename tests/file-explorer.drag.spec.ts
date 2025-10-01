import { test, expect } from '@playwright/test';

const TEST_DIR = 'pw-dnd';

async function resetWorkspace(page) {
  await page.goto('/apps/files');
  await page.waitForTimeout(200);
  await page.evaluate(async (dirName) => {
    const root = await navigator.storage.getDirectory();
    try {
      await root.removeEntry(dirName, { recursive: true });
    } catch {}
    const testDir = await root.getDirectoryHandle(dirName, { create: true });
    await testDir.getDirectoryHandle('dest', { create: true });
    await testDir.getDirectoryHandle('other', { create: true });
    const files = [
      ['alpha.txt', 'alpha'],
      ['beta.txt', 'beta'],
      ['gamma.txt', 'gamma'],
    ];
    for (const [name, value] of files) {
      const handle = await testDir.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(value);
      await writable.close();
    }
  }, TEST_DIR);
  await page.reload();
  await page.locator(`[data-entry-type="dir"][data-entry-name="${TEST_DIR}"]`).click();
}

function textOrderLocator(page) {
  return page
    .locator('[data-testid="file-list"] [data-entry-type="file"] span[data-testid="entry-name"]')
    .allTextContents();
}

test.describe('File Explorer drag and drop', () => {
  test.beforeEach(async ({ page }) => {
    await resetWorkspace(page);
  });

  test('reorders files and persists order', async ({ page }) => {
    const namesBefore = await textOrderLocator(page);
    expect(namesBefore.map((name) => name.trim())).toEqual([
      'alpha.txt',
      'beta.txt',
      'gamma.txt',
    ]);

    const alpha = page.locator('[data-entry-type="file"][data-entry-name="alpha.txt"]');
    const beta = page.locator('[data-entry-type="file"][data-entry-name="beta.txt"]');
    await alpha.dragTo(beta, { targetPosition: { x: 10, y: 2 } });
    await page.waitForTimeout(150);

    const namesAfter = await textOrderLocator(page);
    expect(namesAfter.map((name) => name.trim())).toEqual([
      'beta.txt',
      'alpha.txt',
      'gamma.txt',
    ]);

    await page.reload();
    await page.locator(`[data-entry-type="dir"][data-entry-name="${TEST_DIR}"]`).click();
    const namesReloaded = await textOrderLocator(page);
    expect(namesReloaded.map((name) => name.trim())).toEqual([
      'beta.txt',
      'alpha.txt',
      'gamma.txt',
    ]);
  });

  test('moves and copies between directories with modifier keys', async ({ page }) => {
    const alpha = page.locator('[data-entry-type="file"][data-entry-name="alpha.txt"]');
    const gamma = page.locator('[data-entry-type="file"][data-entry-name="gamma.txt"]');
    const destDir = page.locator('[data-entry-type="dir"][data-entry-name="dest"]');

    await alpha.dragTo(destDir, { targetPosition: { x: 10, y: 4 } });
    await page.waitForTimeout(150);
    await expect(alpha).toHaveCount(0);

    await page.keyboard.down('Control');
    await gamma.dragTo(destDir, { targetPosition: { x: 10, y: 4 } });
    await page.keyboard.up('Control');
    await page.waitForTimeout(150);
    await expect(gamma).toHaveCount(1);

    await destDir.click();
    await expect(
      page.locator('[data-entry-type="file"][data-entry-name="alpha.txt"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-entry-type="file"][data-entry-name="gamma.txt"]'),
    ).toHaveCount(1);

    await page.locator('button:has-text("Back")').click();
    await expect(
      page.locator('[data-entry-type="file"][data-entry-name="gamma.txt"]'),
    ).toHaveCount(1);
  });

  test('imports external files dropped into the workspace', async ({ page }) => {
    const fileList = page.locator('[data-testid="file-list"]');
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await page.evaluate((dt) => {
      const file = new File(['external data'], 'external.txt', { type: 'text/plain' });
      dt.items.add(file);
    }, dataTransfer);

    await fileList.dispatchEvent('dragover', { dataTransfer });
    await fileList.dispatchEvent('drop', { dataTransfer });
    await expect(
      page.locator('[data-entry-type="file"][data-entry-name="external.txt"]'),
    ).toHaveCount(1);

    await page.reload();
    await page.locator(`[data-entry-type="dir"][data-entry-name="${TEST_DIR}"]`).click();
    await expect(
      page.locator('[data-entry-type="file"][data-entry-name="external.txt"]'),
    ).toHaveCount(1);
  });
});
