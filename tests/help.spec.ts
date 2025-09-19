import { test, expect } from '@playwright/test';

test.describe('contextual help', () => {
  test.describe.configure({ timeout: 120_000 });

  test('opens terminal help on F1 and restores focus', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120_000 });

    await page.evaluate(() => {
      const targetId = 'terminal';
      return new Promise<void>((resolve, reject) => {
        const start = Date.now();
        const waitForDesktop = () => {
          const desktop = document.getElementById('desktop');
          if (desktop) {
            const fire = () => window.dispatchEvent(new CustomEvent('open-app', { detail: targetId }));
            fire();
            const interval = window.setInterval(() => {
              const terminalWindow = document.getElementById(targetId);
              if (terminalWindow) {
                window.clearInterval(interval);
                resolve();
                return;
              }
              if (Date.now() - start > 60_000) {
                window.clearInterval(interval);
                reject(new Error('Timed out opening terminal'));
                return;
              }
              fire();
            }, 200);
            return;
          }

          if (Date.now() - start > 60_000) {
            reject(new Error('Desktop did not initialize'));
            return;
          }

          window.setTimeout(waitForDesktop, 100);
        };

        waitForDesktop();
      });
    });

    const terminal = page.locator('#terminal');
    await expect(terminal).toBeVisible();

    await terminal.focus();
    await expect(terminal).toBeFocused();

    await page.keyboard.press('F1');

    const overlay = page.locator('[data-testid="contextual-help"]');
    await expect(overlay).toBeVisible();
    await expect(page.locator('[data-testid="contextual-help-content"]')).toContainText(
      'This terminal emulates basic shell commands.'
    );

    await page.locator('[data-testid="contextual-help-close"]').click();
    await expect(overlay).toBeHidden();
    await expect(terminal).toBeFocused();
  });

  test('loads wireshark help article via deep link', async ({ page }) => {
    await page.goto('/help/wireshark', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page.locator('main h1').first()).toHaveText('Wireshark Help');
    await expect(page.locator('main')).toContainText('The Wireshark simulator visualizes packet captures');
  });
});
