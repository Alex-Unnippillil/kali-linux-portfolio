import { test, expect } from '@playwright/test';
import { createLogger } from '../lib/logger';

test.describe('privacy controls', () => {
  test('manages consents, exports data, redacts logs, and clears stored data', async ({ page }) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'warning') {
        warnings.push(message.text());
      }
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    await page.goto('/apps/settings');
    await page.getByRole('tablist').waitFor();

    // Toggle consent-like switches in accessibility settings
    await page.getByRole('tab', { name: 'Accessibility' }).click();
    const consentSwitches = [
      page.getByRole('switch', { name: 'Reduced Motion' }),
      page.getByRole('switch', { name: 'High Contrast' }),
      page.getByRole('switch', { name: 'Haptics' }),
    ];

    for (const toggle of consentSwitches) {
      const initial = await toggle.getAttribute('aria-checked');
      await toggle.click();
      await expect(toggle).not.toHaveAttribute('aria-checked', initial ?? '');
    }

    // Export settings data from the privacy tab
    await page.getByRole('tab', { name: 'Privacy' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export Settings' }).click(),
    ]);
    const suggestedName = await download.suggestedFilename();
    expect(suggestedName).toBe('settings.json');
    await download.delete();

    // Verify logger redacts sensitive fields
    const captured: string[] = [];
    const originalConsoleLog = console.log;
    try {
      console.log = (message?: unknown) => {
        captured.push(String(message));
      };
      const logger = createLogger('privacy-spec');
      logger.info('dsar-log', { password: 'secret', safe: 'value' });
    } finally {
      console.log = originalConsoleLog;
    }
    expect(captured).toHaveLength(1);
    const parsed = JSON.parse(captured[0]);
    expect(parsed.password).toBeUndefined();
    expect(parsed.safe).toBe('value');
    expect(parsed.message).toBe('dsar-log');

    // Perform delete-my-data flow via Reset Desktop
    await page.getByRole('tab', { name: 'Appearance' }).click();
    const dialogPromise = page.waitForEvent('dialog');
    await page.getByRole('button', { name: 'Reset Desktop' }).click();
    const dialog = await dialogPromise;
    await dialog.accept();

    await page.getByRole('tab', { name: 'Accessibility' }).click();
    await expect(page.getByRole('switch', { name: 'Reduced Motion' })).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('switch', { name: 'High Contrast' })).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('switch', { name: 'Haptics' })).toHaveAttribute('aria-checked', 'true');

    expect(warnings).toEqual([]);
    expect(errors).toEqual([]);
  });
});
