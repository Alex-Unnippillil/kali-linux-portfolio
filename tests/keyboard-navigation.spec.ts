import { test, expect } from '@playwright/test';

test.describe('keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/keyboard');
  });

  test('panel button is reachable via keyboard', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.locator('#panel-btn')).toBeFocused();
  });

  test('drawer and palette are keyboard accessible', async ({ page }) => {
    await page.keyboard.press('Tab'); // focus panel button
    await page.keyboard.press('Tab'); // open drawer button
    await expect(page.locator('#open-drawer')).toBeFocused();
    await page.keyboard.press('Enter');
    const drawer = page.locator('[aria-label="Drawer"]');
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Tab'); // focus close button
    await page.keyboard.press('Tab'); // focus first radio
    const secondRadio = page.locator('[role=radio]').nth(1);
    await page.keyboard.press('ArrowRight');
    await expect(secondRadio).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });

  test('tabs can be changed with arrow keys', async ({ page }) => {
    const firstTab = page.getByRole('tab', { name: 'one' });
    await firstTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'two' })).toHaveAttribute('aria-selected', 'true');
  });

  test('modal opens and closes with keyboard', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // focus open modal button
    await expect(page.locator('#open-modal')).toBeFocused();
    await page.keyboard.press('Enter');
    const modal = page.locator('#modal');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });
});

