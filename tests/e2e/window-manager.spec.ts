import { test, expect } from '@playwright/test';

test.describe('window manager', () => {
  test('multi-window interactions and focus', async ({ page }) => {
    await page.goto('/');

    // Launch terminal
    await page.locator('nav [aria-label="Show Applications"]').click();
    await page.locator('#app-terminal').click();

    // Launch gedit
    await page.locator('nav [aria-label="Show Applications"]').click();
    await page.locator('#app-gedit').click();

    const terminal = page.locator('[data-app-id="terminal"]');
    const gedit = page.locator('[data-app-id="gedit"]');

    // z-index ordering: gedit on top after launch
    const zTerminal = await terminal.evaluate(el => Number(getComputedStyle(el).zIndex));
    const zGedit = await gedit.evaluate(el => Number(getComputedStyle(el).zIndex));
    expect(zGedit).toBeGreaterThan(zTerminal);

    // Bring terminal to front
    await terminal.click();
    const zTerminalFront = await terminal.evaluate(el => Number(getComputedStyle(el).zIndex));
    const zGeditBack = await gedit.evaluate(el => Number(getComputedStyle(el).zIndex));
    expect(zTerminalFront).toBeGreaterThan(zGeditBack);

    // Drag gedit window
    const header = gedit.locator('button').first();
    const startBox = await gedit.boundingBox();
    const headerBox = await header.boundingBox();
    if (headerBox) {
      await page.mouse.move(headerBox.x + headerBox.width / 2, headerBox.y + headerBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(headerBox.x + headerBox.width / 2 + 100, headerBox.y + headerBox.height / 2 + 100);
      await page.mouse.up();
    }
    const movedBox = await gedit.boundingBox();
    if (startBox && movedBox) {
      expect(movedBox.x).toBeGreaterThan(startBox.x + 50);
    }

    // Snap left via keyboard and restore
    await gedit.focus();
    await page.keyboard.down('Alt');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.up('Alt');
    let style = await gedit.getAttribute('style');
    expect(style).toContain('width: 50%');

    await page.keyboard.down('Alt');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.up('Alt');

    // Keyboard navigation between windows
    await page.keyboard.down('Alt');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Alt');
    await expect(terminal).not.toHaveClass(/notFocused/);
    await expect(gedit).toHaveClass(/notFocused/);

    // Opening a context menu should not steal focus
    await terminal.click({ button: 'right' });
    await expect(terminal).not.toHaveClass(/notFocused/);
    await page.keyboard.press('Escape');
    await expect(terminal).not.toHaveClass(/notFocused/);
  });
});
