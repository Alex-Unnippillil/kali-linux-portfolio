import { test, expect } from '@playwright/test';
import crypto from 'crypto';

test.describe('File Manager Checksums', () => {
  test('shows progress and allows copying hashes', async ({ page }) => {
    // Stub clipboard to capture copied text
    await page.addInitScript(() => {
      (window as any)._copied = null;
      navigator.clipboard.writeText = async (text: string) => {
        (window as any)._copied = text;
      };
    });

    // Navigate to file manager and open Checksums tab
    await page.goto('/apps/file-manager');
    await page.getByRole('tab', { name: /Checksums/i }).click();

    // Create a large file to simulate long running hash operation
    const content = 'Hello world';
    const buffer = Buffer.from(content);
    const expected = crypto.createHash('md5').update(content).digest('hex');

    const file = { name: 'test.txt', mimeType: 'text/plain', buffer };
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(file);

    // Progress ring should appear and remain interactive
    const progress = page.locator('[role="progressbar"]');
    await expect(progress).toBeVisible();
    await page.getByRole('tab', { name: /Checksums/i }).click();
    await progress.waitFor({ state: 'hidden' });

    // Verify copy buttons copy correct hash
    const md5Row = page.locator('text=MD5').locator('..');
    const md5Value = await md5Row.locator('input').inputValue();
    await md5Row.getByRole('button', { name: /copy/i }).click();
    const copied = await page.evaluate(() => (window as any)._copied);
    expect(copied).toBe(md5Value);
    expect(md5Value).toBe(expected);
  });
});

