import { test, expect } from '@playwright/test';

// This test exercises the file manager's undo and redo stack by performing
// copy, move and trash operations and verifying both the UI and the
// underlying Origin Private File System reflect each change.

test.describe('File Manager undo/redo', () => {
  test('copy, move, trash and undo/redo', async ({ page }) => {
    // Open the file explorer application
    await page.goto('/apps/file-explorer');

    // Seed the OPFS with a couple of files
    await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      for (const name of ['alpha.txt', 'bravo.txt']) {
        const handle = await root.getFileHandle(name, { create: true });
        const writable = await handle.createWritable();
        await writable.write(name);
        await writable.close();
      }
    });

    // Reload so the file list reflects the new files
    await page.reload();

    const alpha = page.locator('text=alpha.txt');
    await expect(alpha).toBeVisible();

    // Copy alpha.txt and paste in the same directory
    await alpha.click();
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');

    const alphaCopy = page.locator('text=alpha (copy).txt');
    await expect(alphaCopy).toBeVisible();
    await expect(page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      try {
        await root.getFileHandle('alpha (copy).txt');
        return true;
      } catch {
        return false;
      }
    })).resolves.toBe(true);

    // Create destination folder and move the copied file into it
    await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      await root.getDirectoryHandle('moved', { create: true });
    });
    await page.reload();

    await alphaCopy.click();
    await page.keyboard.press('Control+x');
    await page.locator('text=moved').dblclick();
    await page.keyboard.press('Control+v');
    await expect(page.locator('text=alpha (copy).txt')).toBeVisible();

    await expect(page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle('moved');
      try {
        await dir.getFileHandle('alpha (copy).txt');
        return true;
      } catch {
        return false;
      }
    })).resolves.toBe(true);

    // Trash the moved file
    const movedFile = page.locator('text=alpha (copy).txt');
    await movedFile.click();
    await page.keyboard.press('Delete');
    await expect(movedFile).not.toBeVisible();

    await expect(page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle('moved');
      try {
        await dir.getFileHandle('alpha (copy).txt');
        return true;
      } catch {
        return false;
      }
    })).resolves.toBe(false);

    // Undo trash
    await page.keyboard.press('Control+z');
    await expect(page.locator('text=alpha (copy).txt')).toBeVisible();

    // Undo move
    await page.keyboard.press('Control+z');
    await page.locator('text=..').click();
    await expect(page.locator('text=alpha (copy).txt')).toBeVisible();

    // Undo copy
    await page.keyboard.press('Control+z');
    await expect(page.locator('text=alpha (copy).txt')).not.toBeVisible();

    // Redo copy
    await page.keyboard.press('Control+Shift+z');
    await expect(page.locator('text=alpha (copy).txt')).toBeVisible();

    // Redo move
    await page.keyboard.press('Control+Shift+z');
    await page.locator('text=moved').dblclick();
    await expect(page.locator('text=alpha (copy).txt')).toBeVisible();

    // Redo trash
    await page.keyboard.press('Control+Shift+z');
    await expect(page.locator('text=alpha (copy).txt')).not.toBeVisible();
  });
});

