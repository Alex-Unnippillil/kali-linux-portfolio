import { expect, test, Page } from '@playwright/test';

async function openApp(page: Page, appId: string) {
  await page.evaluate((id) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
  }, appId);
  await page.locator(`button[data-app-id="${appId}"]`).first().waitFor();
}

test.describe('task previews', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#desktop');
  });

  test('shows a live preview when hovering a running app', async ({ page }) => {
    await openApp(page, 'terminal');

    const taskButton = page.locator('button[data-app-id="terminal"]').first();
    await taskButton.hover();

    const preview = page.locator('[data-testid="task-preview"]');
    await expect(preview).toBeVisible();
    await expect(preview.locator('text=Terminal')).toBeVisible();

    await page.mouse.move(10, 10);
    await expect(preview).toHaveCount(0);
  });

  test('closing from the preview focuses the next window', async ({ page }) => {
    await openApp(page, 'terminal');
    await openApp(page, 'calculator');

    const terminalButton = page.locator('button[data-app-id="terminal"]').first();
    const calculatorButton = page.locator('button[data-app-id="calculator"]').first();

    await terminalButton.hover();
    const preview = page.locator('[data-testid="task-preview"]');
    await expect(preview).toBeVisible();

    await preview.locator('[data-testid="task-preview-close"]').click();

    await expect(terminalButton).toHaveCount(0);
    await expect(calculatorButton).toBeFocused();
  });
});
